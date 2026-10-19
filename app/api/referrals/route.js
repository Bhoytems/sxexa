import { db } from '@/lib/supabase';
import { authUser, unauthorized } from '@/lib/auth';
import { referralBalance } from '@/lib/balance';

export async function GET(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  const { data: friends } = await db.from('users').select('id,first_name').eq('referred_by', u.id);
  const { data: earn } = await db.from('referral_earnings').select('referred_id,amount_usd').eq('referrer_id', u.id);
  const per = {};
  for (const r of earn || []) per[r.referred_id] = (per[r.referred_id] || 0) + Number(r.amount_usd);
  const { earned, available } = await referralBalance(u.id);
  return Response.json({
    friends: (friends || []).length, active: Object.keys(per).length, earned, available,
    list: (friends || []).map((f) => ({ name: f.first_name, earned: per[f.id] || 0 })).sort((a, b) => b.earned - a.earned).slice(0, 20),
  });
}
