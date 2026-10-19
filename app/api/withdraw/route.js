import { db } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import { authUser, unauthorized } from '@/lib/auth';
import { referralBalance } from '@/lib/balance';

// Creates a withdrawal request for the full available balance. You approve it in the admin panel.
export async function POST(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  if (!u.wallet) return Response.json({ error: 'Link a wallet first' }, { status: 400 });
  const s = await getSettings();
  const { data: pending } = await db.from('withdrawals').select('id').eq('user_id', u.id).eq('status', 'pending');
  if (pending?.length) return Response.json({ error: 'You already have a pending withdrawal' }, { status: 409 });
  const { available } = await referralBalance(u.id);
  if (available < s.min_withdraw_usd) return Response.json({ error: `Minimum withdrawal is $${s.min_withdraw_usd}` }, { status: 400 });
  const fee = s.withdrawal_fee_usd;
  await db.from('withdrawals').insert({ user_id: u.id, amount_usd: available, fee_usd: fee, payout_usd: available - fee, wallet: u.wallet });
  return Response.json({ ok: true, payoutUsd: available - fee });
}
