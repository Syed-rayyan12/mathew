'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/lib/api/auth';

export type NurseryPlan = 'standard' | 'platinum' | 'free';

export function useNurseryPlan(): NurseryPlan {
  const [plan, setPlan] = useState<NurseryPlan>('standard');

  useEffect(() => {
    const user = authService.getCurrentUser();
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
