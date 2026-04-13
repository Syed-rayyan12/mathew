'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/lib/api/auth';

export type NurseryPlan = 'standard' | 'platinum' | 'free';

export function useNurseryPlan(): NurseryPlan {
  const [plan, setPlan] = useState<NurseryPlan>('standard');

  useEffect(() => {
    // Read from nursery-specific key first; nursery login stores data under 'nurseryUser'
    // to avoid overwriting the parent 'user' session key
    let user: any = null;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('nurseryUser') : null;
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }
    // Fallback to the shared user key (covers edge cases)
    if (!user) {
      user = authService.getCurrentUser();
    }
    const rawPlan = user?.plan?.toLowerCase() ?? 'standard';
    // Treat 'free' as 'standard', anything not platinum is standard
    if (rawPlan === 'platinum') {
      setPlan('platinum');
    } else {
      setPlan('standard');
    }
  }, []);

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
