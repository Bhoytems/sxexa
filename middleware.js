import { NextResponse } from 'next/server';
// Blocks restricted regions using Vercel's country header. Set BLOCKED_COUNTRIES (for example "US").
export function middleware(req) {
  const blocked = (process.env.BLOCKED_COUNTRIES || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  if (country && blocked.includes(country)) return new NextResponse('Soledge is not available in your region.', { status: 451 });
  return NextResponse.next();
}
export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };
