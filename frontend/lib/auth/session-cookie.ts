// Session marker cookies read by middleware.ts to gate dashboard routes.
// They are a UX gate only — the API (Bearer token + backend checks) remains
// the security boundary. Set by client JS because the backend is cross-origin.

export type SessionType = 'parent' | 'admin' | 'nursery';

export const SESSION_COOKIES: Record<SessionType, string> = {
  parent: 'mn_session_parent',
  admin: 'mn_session_admin',
  nursery: 'mn_session_nursery',
};

export const LOGIN_PATHS: Record<SessionType, string> = {
  parent: '/user-signIn',
  admin: '/admin-login',
  nursery: '/nursery-login',
};

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // matches refresh token lifetime (30d)

export function setSessionCookie(type: SessionType, role: string): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIES[type]}=${encodeURIComponent(role)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearSessionCookie(type: SessionType): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIES[type]}=; path=/; max-age=0; SameSite=Lax`;
}

// Only allow internal paths as post-login redirect targets
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}
