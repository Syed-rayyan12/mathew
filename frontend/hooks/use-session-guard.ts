'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminTokenManager,
  ITokenManager,
  NurseryTokenManager,
  TokenManager,
} from '@/lib/api/client';
import {
  LOGIN_PATHS,
  SessionType,
  setSessionCookie,
} from '@/lib/auth/session-cookie';

const TOKEN_MANAGERS: Record<SessionType, ITokenManager> = {
  parent: TokenManager,
  admin: AdminTokenManager,
  nursery: NurseryTokenManager,
};

const SESSION_STORAGE_KEYS: Record<SessionType, string[]> = {
  parent: ['accessToken', 'user'],
  admin: ['adminAccessToken', 'adminUser', 'adminRole'],
  nursery: ['nurseryAccessToken', 'nurseryUser'],
};

export function useSessionGuard(type: SessionType, allowedRoles: string[]) {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(false);
  const allowedRolesKey = allowedRoles.join('|');

  useEffect(() => {
    const tokenManager = TOKEN_MANAGERS[type];
    const roles = allowedRolesKey.split('|');

    const checkSession = () => {
      const token = tokenManager.getAccessToken();
      let user: { role?: string } | null = null;

      try {
        user = tokenManager.getUser();
      } catch {
        user = null;
      }

      // Older nursery sessions predate nurseryUser storage. Their token is
      // still validated and role-checked by the API on every request.
      const role = user?.role || (type === 'nursery' && token ? 'NURSERY_OWNER' : null);

      if (!token || !role || !roles.includes(role)) {
        setReady(null);
        tokenManager.clearTokens();

        const returnTo = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        router.replace(`${LOGIN_PATHS[type]}?returnTo=${returnTo}`);
        return;
      }

      setSessionCookie(type, role);
      setReady(true);
    };

    checkSession();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || SESSION_STORAGE_KEYS[type].includes(event.key)) {
        checkSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [allowedRolesKey, router, type]);

  return { ready };
}
