import { db } from './supabase';
// available = everything earned minus everything already withdrawn or pending.
export async function referralBalance(userId) {
  const [{ data: e }, { data: w }] = await Promise.all([
    db.from('referral_earnings').select('amount_usd').eq('referrer_id', userId),
    db.from('withdrawals').select('amount_usd').eq('user_id', userId).in('status', ['pending', 'paid']),
  ]);
  const earned = (e || []).reduce((a, r) => a + Number(r.amount_usd), 0);
  const taken = (w || []).reduce((a, r) => a + Number(r.amount_usd), 0);
  return { earned, available: Math.max(0, earned - taken) };
}
