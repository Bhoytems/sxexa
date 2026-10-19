import { db } from './supabase';
import { validateInitData } from './telegram';

// Every API route calls this first. Identity comes only from Telegram's signed data.
export async function authUser(req) {
  const v = validateInitData(req.headers.get('x-tg-init-data'), process.env.BOT_TOKEN);
  if (!v?.user?.id) return null;
  const u = v.user;
  const { data: existing } = await db.from('users').select('*').eq('id', u.id).maybeSingle();
  let referredBy = existing?.referred_by ?? null;
  if (!existing && v.startParam?.startsWith('ref_')) {
    const refId = Number(v.startParam.slice(4));
    if (refId && refId !== u.id) {
      const { data: ref } = await db.from('users').select('id').eq('id', refId).maybeSingle();
      if (ref) referredBy = refId; // single level; self-referral blocked above
    }
  }
  const row = { id: u.id, first_name: u.first_name, username: u.username || null, photo_url: u.photo_url || null, referred_by: referredBy };
  const { data } = await db.from('users').upsert(row).select().single();
  const admins = (process.env.ADMIN_TG_IDS || '').split(',').map((x) => x.trim());
  return { ...data, isAdmin: admins.includes(String(u.id)) };
}
export const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
