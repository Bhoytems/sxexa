import { db } from '@/lib/supabase';
import { authUser, unauthorized } from '@/lib/auth';
export async function POST(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  await db.from('users').update({ terms_accepted_at: new Date().toISOString() }).eq('id', u.id);
  return Response.json({ ok: true });
}
