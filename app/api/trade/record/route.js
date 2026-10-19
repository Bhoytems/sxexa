import { db } from '@/lib/supabase';
import { authUser, unauthorized } from '@/lib/auth';
import { connection } from '@/lib/solana';
import { ixSigs, containsInOrder } from '@/lib/ixsig';

// Records a trade only if the transaction that landed on-chain contains every instruction the server built
// (fee transfer, deposit and Drift order). Size and fee come from the stored intent, never from the client.
export async function POST(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  const { intentId, signature } = await req.json();
  const { data: intent } = await db.from('trade_intents').select('*').eq('id', intentId).eq('user_id', u.id).maybeSingle();
  if (!intent || intent.used || Date.now() - new Date(intent.created_at).getTime() > 15 * 60 * 1000) return Response.json({ error: 'trade expired' }, { status: 400 });

  const t = await connection().getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
  if (!t || t.meta?.err) return Response.json({ error: 'transaction not confirmed' }, { status: 400 });
  const msg = t.transaction.message;
  if (msg.staticAccountKeys[0].toBase58() !== u.wallet) return Response.json({ error: 'wrong signer' }, { status: 400 });
  if (!containsInOrder(ixSigs(msg), intent.ix_sigs)) return Response.json({ error: 'transaction does not match the prepared trade' }, { status: 400 });

  const { data: claimed } = await db.from('trade_intents').update({ used: true }).eq('id', intentId).eq('used', false).select('id');
  if (!claimed?.length) return Response.json({ error: 'already recorded' }, { status: 409 });
  const { data: trade, error } = await db.from('trades').insert({
    user_id: u.id, signature, kind: intent.kind, side: intent.side, position_usd: intent.position_usd,
    leverage: intent.leverage, fee_rate: intent.fee_rate, fee_usd: intent.fee_usd,
  }).select().single();
  if (error) return Response.json({ error: 'already recorded' }, { status: 409 });
  if (u.referred_by) {
    const { data: s } = await db.from('settings').select('value').eq('key', 'referral_share').single();
    await db.from('referral_earnings').insert({ referrer_id: u.referred_by, referred_id: u.id, trade_id: trade.id, amount_usd: Number(intent.fee_usd) * Number(s.value) });
  }
  return Response.json({ ok: true });
}
