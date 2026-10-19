import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { db } from '@/lib/supabase';
import { authUser, unauthorized } from '@/lib/auth';

// Links a payout wallet. The user must sign a message with it, so nobody can claim someone else's wallet.
export async function POST(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  const { wallet, message, signature } = await req.json();
  const m = /^Soledge link (\d+) (\d+)$/.exec(message || '');
  if (!m || Number(m[1]) !== u.id || Math.abs(Date.now() - Number(m[2])) > 5 * 60 * 1000) return Response.json({ error: 'bad message' }, { status: 400 });
  let ok = false;
  try { ok = nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signature), bs58.decode(wallet)); } catch {}
  if (!ok) return Response.json({ error: 'bad signature' }, { status: 400 });
  await db.from('users').update({ wallet }).eq('id', u.id);
  return Response.json({ ok: true });
}
