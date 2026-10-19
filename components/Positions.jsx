'use client';
import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import { readPosition, sendPrepared, placeProtection } from '@/lib/drift';

export default function Positions({ toast }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [pos, setPos] = useState(undefined);
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');

  const load = useCallback(async () => {
    if (!wallet.publicKey) return setPos(null);
    try { setPos(await readPosition(connection, wallet)); } catch { setPos(null); }
    try { setPrice(Number((await (await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot')).json()).data.amount)); } catch {}
  }, [connection, wallet]);
  useEffect(() => { load(); }, [load]);

  async function close() {
    setBusy(true);
    try {
      const p = await api('/api/trade/prepare', { kind: 'close' });
      const signature = await sendPrepared(connection, wallet, p.tx);
      await api('/api/trade/record', { intentId: p.intentId, signature });
      toast('Position closed'); load();
    } catch (e) { toast(e.message); }
    setBusy(false);
  }
  async function protect() {
    setBusy(true);
    const note = await placeProtection({ connection, wallet, long: pos.long, tp: Number(tp), sl: Number(sl) });
    toast(note || 'Take profit / stop loss set');
    setBusy(false);
  }

  const pnl = pos && price ? (pos.long ? price - pos.entry : pos.entry - price) * pos.sizeSol : null;
  return (
    <div className="screen">
      <h1>Positions</h1>
      {!wallet.publicKey && <div className="c m">Connect your wallet on the Trade or Profile tab to see your positions.</div>}
      {wallet.publicKey && pos === null && <div className="c m">No open position. Open a trade from the Trade tab.</div>}
      {pos && (
        <>
          <div className="c">
            <div className="row"><b>SOL-PERP <span className={pos.long ? 'g' : 'r'}>{pos.long ? 'Long' : 'Short'}</span></b>
              {pnl !== null && <b className={pnl >= 0 ? 'g' : 'r'}>{pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}</b>}</div>
            <div className="row m" style={{ marginTop: 10 }}><span>Size {pos.sizeSol.toFixed(3)} SOL</span><span>Entry ${pos.entry.toFixed(2)}</span></div>
            <div className="row" style={{ marginTop: 12 }}><button className="sec r" disabled={busy} onClick={close}>{busy ? 'Working…' : 'Close position'}</button></div>
          </div>
          <div className="c">
            <div className="m">Set take profit / stop loss</div>
            <div className="row" style={{ marginTop: 8 }}>
              <div className="f"><label className="m" htmlFor="ptp">Take profit</label><input id="ptp" type="number" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
              <div className="f"><label className="m" htmlFor="psl">Stop loss</label><input id="psl" type="number" inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value)} /></div>
            </div>
            <button className="sec" style={{ marginTop: 10, width: '100%' }} disabled={busy || (!tp && !sl)} onClick={protect}>Set orders</button>
          </div>
        </>
      )}
    </div>
  );
}
