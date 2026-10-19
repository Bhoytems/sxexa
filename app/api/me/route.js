import { authUser, unauthorized } from '@/lib/auth';
export async function GET(req) {
  const u = await authUser(req);
  if (!u) return unauthorized();
  const link = `https://t.me/${process.env.BOT_USERNAME}/${process.env.MINIAPP_SHORT_NAME}?startapp=ref_${u.id}`;
  return Response.json({ id: u.id, firstName: u.first_name, username: u.username, photoUrl: u.photo_url, wallet: u.wallet, termsAccepted: !!u.terms_accepted_at, isAdmin: u.isAdmin, referralLink: link });
}
