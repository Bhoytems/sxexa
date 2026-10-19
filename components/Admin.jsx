'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const usd = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Admin({ toast }) {
  const [rev, setRev] = useState(null);
  const [pending, setPending] = useState([]);
  const load = () => { api('/api/admin/revenue').then(setRev).catch((e) => toast(e.message)); api('/api/admin/withdrawals').then((r) => setPending(r.pending)).catch(() => {}); };
  useEffect(() => { load(); }, []);
  async function act(id, action) {
    try { await api('/api/admin/withdrawals', { id, action }); toast(action === 'approve' ? 'Paid' : 'Rejected'); load(); } catch (e) { toast(e.message); }
  }
  if (!rev) return null;
  return (
    <>
      <h1>Revenue (this month)</h1>
      <div className="c"><div className="m">Net revenue</div><div className="g" style={{ fontSize: 26, fontWeight: 700 }}>{usd(rev.net)}</div></div>
      <div className="row"><div className="c f"><span className="m">Fees collected</span><b>{usd(rev.feesCollected)}</b></div><div className="c f"><span className="m">Owed to referrers</span><b className="r">{usd(rev.owedToReferrers)}</b></div></div>
      <div className="c m">
        <div className="row"><span>Trading volume</span><span>{usd(rev.volume)}</span></div>
        <div className="row" style={{ marginTop: 6 }}><span>Withdrawal fees (net of gas)</span><span>{usd(rev.withdrawalFees)}</span></div>
      </div>
      <div className="m">Pending withdrawals</div>
      <div className="c">{pending.length === 0 ? <span className="m">None</span> : pending.map((w, i) => (
        <div key={w.id} style={{ marginTop: i ? 14 : 0 }}>
          <div className="row"><span>{w.users?.first_name}</span><b>{usd(w.payout_usd)}</b></div>
          <div className="row" style={{ marginTop: 8 }}><button className="sec g" onClick={() => act(w.id, 'approve')}>Approve</button><button className="sec r" onClick={() => act(w.id, 'reject')}>Reject</button></div>
        </div>))}</div>
    </>
  );
}
