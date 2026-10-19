'use client';
import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import { sendPrepared, placeProtection } from '@/lib/drift';
import Logo from './Logo';
import LinkWallet from './LinkWallet';

export default function Trade({ cfg, me, reloadMe, toast }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [price, setPrice] = useState(null);
  const [f, setF] = useState({ side: 'long', type: 'market', entry: '', margin: '20', lev: 3, tp: '', sl: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Display price only. The venue's own oracle sets the real fill price.
  useEffect(() => {
    let on = true;
    const get = async () => {
      try { const j = await (await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot')).json(); if (on) setPrice(Number(j.data.amount)); } catch {}
    };
    get();
    const t = setInterval(get, 4000);
    return () => { on = false; clearInterval(t); };
  }, []);

  const long = f.side === 'long';
  const margin = Number(f.margin) || 0;
  const size = margin * f.lev;
  const entry = f.type === 'market' ? price : Number(f.entry);
  const fee = size * cfg.feeRate;
  const liq = entry ? (long ? entry * (1 - 0.9 / f.lev) : entry * (1 + 0.9 / f.lev)) : null; // rough estimate
  const sl = Number(f.sl), tp = Number(f.tp);
  const accepted = me.termsAccepted;
  const accept = async () => { try { await api('/api/terms', {}); await reloadMe(); } catch (e) { toast(e.message); } };
  const linked = me.wallet && wallet.publicKey?.toBase58() === me.wallet;

  let err = null;
  if (size < cfg.minOrderUsd) err = `Minimum order is $${cfg.minOrderUsd}`;
  else if (!entry) err = 'Enter an entry price';
  else if (sl && (long ? sl >= entry : sl <= entry)) err = 'Stop loss must be on the losing side of your entry';
  else if (tp && (long ? tp <= entry : tp >= entry)) err = 'Take profit must be on the winning side of your entry';
  else if (sl && liq && (long ? sl <= liq : sl >= liq)) err = 'Stop loss is beyond your liquidation price';

  async function submit() {
    setBusy(true);
    try {
      const p = await api('/api/trade/prepare', { kind: 'open', side: f.side, type: f.type, entry: f.type === 'limit' ? entry : undefined, margin, leverage: f.lev });
      const signature = await sendPrepared(connection, wallet, p.tx);
      await api('/api/trade/record', { intentId: p.intentId, signature });
      const note = await placeProtection({ connection, wallet, long, tp, sl });
      toast(note || 'Order placed');
    } catch (e) { toast(e.message); }
    setBusy(false);
  }

  return (
    <div className="screen">
      <div className="row">
        <div className="row"><Logo /><b style={{ fontSize: 18 }}>Soledge</b></div>
        {me.photoUrl ? <img className="av" src={me.photoUrl} alt="" width={32} height={32} /> : <div className="av">{me.firstName?.[0]}</div>}
      </div>
      <div className="c row">
        <div><div className="m">SOL-PERP</div><div style={{ fontSize: 26, fontWeight: 700 }}>{price ? `$${price.toFixed(2)}` : '…'}</div></div>
      </div>
      <div className="seg">
        <button className={`long ${long ? 'on' : ''}`} onClick={() => set('side', 'long')}>Long</button>
        <button className={`short ${!long ? 'on' : ''}`} onClick={() => set('side', 'short')}>Short</button>
      </div>
      <div className="seg">
        <button className={f.type === 'market' ? 'long on' : ''} onClick={() => set('type', 'market')}>Market</button>
        <button className={f.type === 'limit' ? 'long on' : ''} onClick={() => set('type', 'limit')}>Limit</button>
      </div>
      <div className="row">
        {f.type === 'limit' && <div className="f"><label className="m" htmlFor="e">Limit entry (USD)</label><input id="e" type="number" inputMode="decimal" value={f.entry} onChange={(e) => set('entry', e.target.value)} /></div>}
        <div className="f"><label className="m" htmlFor="m">Margin (USD)</label><input id="m" type="number" inputMode="decimal" value={f.margin} onChange={(e) => set('margin', e.target.value)} /></div>
      </div>
      <div className="c">
        <div className="row"><label className="m" htmlFor="lev">Leverage</label><b>{f.lev}x</b></div>
        <input id="lev" type="range" min="1" max={cfg.maxLeverage} value={f.lev} onChange={(e) => set('lev', Number(e.target.value))} />
        <div className="row m"><span>1x</span><span>Max {cfg.maxLeverage}x</span></div>
        {f.lev > 5 && <div className="m r" style={{ marginTop: 6 }}>High leverage: a small move against you can liquidate your position.</div>}
      </div>
      <div className="row">
        <div className="f"><label className="m" htmlFor="tp">Take profit</label><input id="tp" type="number" inputMode="decimal" value={f.tp} onChange={(e) => set('tp', e.target.value)} /></div>
        <div className="f"><label className="m" htmlFor="sl">Stop loss</label><input id="sl" type="number" inputMode="decimal" value={f.sl} onChange={(e) => set('sl', e.target.value)} /></div>
      </div>
      <div className="c m">
        <div className="row"><span>Position size (min ${cfg.minOrderUsd})</span><span>${size.toFixed(2)}</span></div>
        <div className="row" style={{ marginTop: 6 }}><span>Liquidation price (approx.)</span><span className="r">{liq ? `$${liq.toFixed(2)}` : '-'}</span></div>
        <div className="row" style={{ marginTop: 6 }}><span>Soledge fee ({(cfg.feeRate * 100).toFixed(2)}%)</span><span>${fee.toFixed(2)}</span></div>
      </div>
      {!accepted && (
        <div className="c">
          <div className="m">Leveraged trading is high risk. You can lose all of your margin.{process.env.NEXT_PUBLIC_TERMS_URL && <> Read the <a href={process.env.NEXT_PUBLIC_TERMS_URL} style={{ color: 'var(--accent)' }}>terms and risk disclosure</a>.</>}</div>
          <button className="sec" style={{ marginTop: 10, width: '100%' }} onClick={accept}>I accept the terms and understand the risks</button>
        </div>
      )}
      {!linked && <LinkWallet me={me} reloadMe={reloadMe} toast={toast} />}
      {!sl && <div className="m r">No stop loss: if the price moves against you, you can lose your entire margin.</div>}
      {err && <div className="err">{err}</div>}
      <button className="cta" disabled={busy || !linked || !accepted || !!err} onClick={submit}>{busy ? 'Waiting for wallet…' : `Open ${long ? 'Long' : 'Short'} ${f.lev}x`}</button>
    </div>
  );
}
