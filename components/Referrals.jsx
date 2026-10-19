'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Referrals({ cfg, me, toast }) {
  const [d, setD] = useState(null);
  const load = () => api('/api/referrals').then(setD).catch((e) => toast(e.message));
  useEffect(() => { load(); }, []);
  const share = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(me.referralLink)}&text=${encodeURIComponent('Trade SOL with leverage on Soledge')}`;
    window.Telegram?.WebApp?.openTelegramLink ? window.Telegram.WebApp.openTelegramLink(url) : window.open(url);
  };
  const copy = async () => { await navigator.clipboard.writeText(me.referralLink); toast('Link copied'); };
  async function withdraw() {
    try { const r = await api('/api/withdraw', {}); toast(`Requested. You will receive $${r.payoutUsd.toFixed(2)}`); load(); } catch (e) { toast(e.message); }
  }
  if (!d) return <div className="screen"><h1>Referrals</h1></div>;
  const fee = cfg.withdrawalFeeUsd;
  const can = d.available >= cfg.minWithdrawUsd;
  return (
    <div className="screen">
      <h1>Referrals</h1>
      <div className="c">
        <div className="m">Your invite link</div>
        <div style={{ fontSize: 13, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.referralLink}</div>
        <div className="row" style={{ marginTop: 10 }}><button className="sec" onClick={copy}>Copy link</button><button className="sec" onClick={share}>Share in Telegram</button></div>
      </div>
      <div className="row" style={{ textAlign: 'center' }}>
        <div className="c f"><b>{d.friends}</b><span className="m">Friends</span></div>
        <div className="c f"><b>{d.active}</b><span className="m">Active</span></div>
        <div className="c f"><b>${d.earned.toFixed(2)}</b><span className="m">Earned</span></div>
      </div>
      <div className="c">
        <div className="m">Available to withdraw</div>
        <div className="g" style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>${d.available.toFixed(2)}</div>
        <div className="m">You earn {Math.round(cfg.referralShare * 100)}% of the Soledge fee on your friends' trades. Minimum withdrawal ${cfg.minWithdrawUsd}, paid in USDC to your linked wallet.</div>
        {can && <><div className="row" style={{ marginTop: 10 }}><span className="m">Withdrawal fee</span><span>-${fee.toFixed(2)}</span></div>
          <div className="row" style={{ marginTop: 4 }}><span className="m">You receive</span><b>${(d.available - fee).toFixed(2)}</b></div></>}
        <button className="cta" style={{ marginTop: 12 }} disabled={!can || !me.wallet} onClick={withdraw}>{can ? `Withdraw $${d.available.toFixed(2)}` : `Reach $${cfg.minWithdrawUsd} to withdraw`}</button>
        {!me.wallet && <div className="m" style={{ marginTop: 6 }}>Link a wallet in Profile first.</div>}
      </div>
      <div className="m">Friends</div>
      <div className="c">{d.list.length === 0 ? <span className="m">Share your link to start earning.</span> : d.list.map((f, i) => (
        <div className="row" key={i} style={{ marginTop: i ? 10 : 0 }}><span>{f.name}</span><b className="g">+${f.earned.toFixed(2)}</b></div>))}</div>
    </div>
  );
}
