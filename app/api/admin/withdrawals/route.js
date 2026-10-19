import { db } from '@/lib/supabase';
import { authUser, unauthorized } from '@/lib/auth';
import { payUsdc } from '@/lib/payout';

export async function GET(req) {
  const u = await authUser(req);
  if (!u?.isAdmin) return unauthorized();
  const { data } = await db.from('withdrawals').select('id,amount_usd,payout_usd,fee_usd,wallet,users(first_name)').eq('status', 'pending').order('created_at');
  return Response.json({ pending: data || [] });
}

export async function POST(req) {
  const u = await authUser(req);
  if (!u?.isAdmin) return unauthorized();
  const { id, action } = await req.json();
  // Flip pending -> processing in one atomic step so a double tap can't pay twice.
  const { data: w } = await db.from('withdrawals').update({ status: action === 'approve' ? 'paid' : 'rejected', processed_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending').select().maybeSingle();
  if (!w) return Response.json({ error: 'not pending' }, { status: 409 });
  if (action === 'reject') return Response.json({ ok: true });
  try {
    const { signature, gasLamports } = await payUsdc(w.wallet, Number(w.payout_usd));
    await db.from('withdrawals').update({ signature, gas_lamports: gasLamports }).eq('id', id);
    return Response.json({ ok: true, signature });
  } catch (e) {
    await db.from('withdrawals').update({ status: 'pending', processed_at: null }).eq('id', id); // payout failed, put it back
    return Response.json({ error: 'payout failed' }, { status: 500 });
  }
}
