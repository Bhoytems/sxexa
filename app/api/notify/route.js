import { db } from '@/lib/supabase';
import { authUser, unauthorized } from '@/lib/auth';
import { sendMessage } from '@/lib/telegramBot';

const WELCOME = 'Welcome to Soledge. Trade SOL with leverage, set your take profit and stop loss, and earn from referrals.\n\nLeveraged trading is high risk. You can lose all of your margin.';

// Called after the user answers the in-app "Allow messages?" popup.
// Accepting is verified by actually sending the message, so the app never trusts the browser's claim.
export async function POST(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  const { allowed } = await req.json();
  if (!allowed) {
    await db.from('users').update({ notify_status: 'declined' }).eq('id', u.id);
    return Response.json({ ok: true });
  }
  const text = u.welcomed_at ? 'Messages are on. We will tell you when a withdrawal is paid.' : WELCOME;
  const url = `https://t.me/${process.env.BOT_USERNAME}/${process.env.MINIAPP_SHORT_NAME}`;
  const sent = await sendMessage(u.id, text, { reply_markup: { inline_keyboard: [[{ text: 'Open Soledge', url }]] } });
  if (!sent) return Response.json({ error: 'Could not message you. Please try again.' }, { status: 400 });
  await db.from('users').update({ notify_status: 'allowed', welcomed_at: u.welcomed_at ?? new Date().toISOString() }).eq('id', u.id);
  return Response.json({ ok: true });
}
