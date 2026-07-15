import { NextRequest, NextResponse } from 'next/server';

// Server-side gate for the dashboards: without the matching session cookie the
// page shell never renders — the visitor is bounced to the right login with a
// returnTo. This is a UX gate; real enforcement is the Bearer token + backend
// role checks on every API call.
const GUARDS = [
  { prefix: '/admin-dashboard', cookie: 'mn_session_admin', login: '/admin-login' },
  { prefix: '/nursery-dashboard', cookie: 'mn_session_nursery', login: '/nursery-login' },
  { prefix: '/settings', cookie: 'mn_session_nursery', login: '/nursery-login' },
  { prefix: '/parent-dashboard', cookie: 'mn_session_parent', login: '/user-signIn' },
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const guard = GUARDS.find((g) => pathname.startsWith(g.prefix));

  if (guard && !req.cookies.get(guard.cookie)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = guard.login;
    url.search = `?returnTo=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin-dashboard/:path*',
    '/nursery-dashboard/:path*',
    '/parent-dashboard/:path*',
    '/settings/:path*',
  ],
};
