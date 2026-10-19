import { PublicKey } from '@solana/web3.js';
import { db } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import { authUser, unauthorized } from '@/lib/auth';
import { buildOpen, buildClose } from '@/lib/driftServer';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Builds the unsigned transaction on the server and remembers what it contains.
// The client can only sign it; it cannot choose the size or the fee.
export async function POST(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  if (!u.wallet) return Response.json({ error: 'Link a wallet first' }, { status: 400 });
  if (!u.terms_accepted_at) return Response.json({ error: 'Accept the terms first' }, { status: 403 });
  const b = await req.json();
  const s = await getSettings();
  const userPk = new PublicKey(u.wallet);
  try {
    let built, side = b.side;
    if (b.kind === 'close') {
      built = await buildClose({ userPk, feeRate: s.fee_rate });
      side = built.side;
    } else {
      const margin = Number(b.margin), lev = Number(b.leverage), entry = Number(b.entry);
      if (!['long', 'short'].includes(b.side) || !['market', 'limit'].includes(b.type)) return Response.json({ error: 'bad request' }, { status: 400 });
      if (!(margin > 0) || !(lev >= 1) || lev > s.max_leverage) return Response.json({ error: `Leverage must be 1x to ${s.max_leverage}x` }, { status: 400 });
      if (margin * lev < s.min_order_usd) return Response.json({ error: `Minimum order is $${s.min_order_usd}` }, { status: 400 });
      if (b.type === 'limit' && !(entry > 0)) return Response.json({ error: 'Enter a limit price' }, { status: 400 });
      built = await buildOpen({ userPk, side: b.side, type: b.type, entry, marginUsd: margin, leverage: lev, feeRate: s.fee_rate });
    }
    const { data: intent } = await db.from('trade_intents').insert({
      user_id: u.id, kind: b.kind === 'close' ? 'close' : 'open', side, position_usd: built.positionUsd,
      leverage: b.kind === 'close' ? null : Number(b.leverage), fee_rate: s.fee_rate, fee_usd: built.feeUsd, ix_sigs: built.ixSigs,
    }).select('id').single();
    const tx = built.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
    return Response.json({ intentId: intent.id, tx, positionUsd: built.positionUsd, feeUsd: built.feeUsd });
  } catch (e) {
    return Response.json({ error: e.message || 'Could not build the trade' }, { status: 400 });
  }
}
