import { db } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import { authUser, unauthorized } from '@/lib/auth';

export async function GET(req) {
  const u = await authUser(req);
  if (!u?.isAdmin) return unauthorized();
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const since = start.toISOString();
  const sum = (rows, k) => (rows || []).reduce((a, r) => a + Number(r[k] || 0), 0);
  const [{ data: trades }, { data: earn }, { data: allEarn }, { data: paid }, { data: wd }] = await Promise.all([
    db.from('trades').select('fee_usd,position_usd').gte('created_at', since),
    db.from('referral_earnings').select('amount_usd').gte('created_at', since),
    db.from('referral_earnings').select('amount_usd'),
    db.from('withdrawals').select('amount_usd').in('status', ['pending', 'paid']),
    db.from('withdrawals').select('fee_usd,gas_lamports').eq('status', 'paid').gte('processed_at', since),
  ]);
  const solUsd = Number(process.env.SOL_PRICE_USD || 150); // reporting only
  const gasUsd = (sum(wd, 'gas_lamports') / 1e9) * solUsd;
  const withdrawalFees = sum(wd, 'fee_usd') - gasUsd;
  const feesCollected = sum(trades, 'fee_usd');
  const s = await getSettings();
  return Response.json({
    feesCollected, volume: sum(trades, 'position_usd'), referralsAccrued: sum(earn, 'amount_usd'),
    owedToReferrers: sum(allEarn, 'amount_usd') - sum(paid, 'amount_usd'),
    withdrawalFees, net: feesCollected - sum(earn, 'amount_usd') + withdrawalFees,
    feeRate: s.fee_rate, referralShare: s.referral_share,
  });
}
