'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/lib/api/auth';

export type NurseryPlan = 'standard' | 'platinum' | 'free';

function readPlanFromStorage(): NurseryPlan {
  let user: any = null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('nurseryUser') : null;
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }
  // Fallback to the shared user key
  if (!user) {
    user = authService.getCurrentUser();
  }
  const rawPlan = user?.plan?.toLowerCase() ?? 'standard';
  return rawPlan === 'platinum' ? 'platinum' : 'standard';
}

export function useNurseryPlan(): NurseryPlan {
  const [plan, setPlan] = useState<NurseryPlan>('standard');

  const refresh = useCallback(() => {
    setPlan(readPlanFromStorage());
  }, []);

  useEffect(() => {
    // Read immediately on mount
    refresh();

    // Re-read when localStorage changes in another tab
    window.addEventListener('storage', refresh);

    // Re-read when the user returns to the tab (e.g. after Stripe redirect)
    window.addEventListener('focus', refresh);

    // Re-read when Next.js soft-navigates back to this page
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refresh]);

  return plan;
}

export function usePlanFeatures() {
  const plan = useNurseryPlan();
  const isPlatinum = plan === 'platinum';

  return {
    plan,
    canManageTeamMembers: isPlatinum,
    canUploadVideo: isPlatinum,
    canApproveRejectReviews: isPlatinum,
    maxNurseries: isPlatinum ? Infinity : 1,
  };
}
