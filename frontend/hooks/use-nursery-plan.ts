'use client';

import { authService } from '@/lib/api/auth';

export type NurseryPlan = 'standard' | 'platinum';

export function useNurseryPlan(): NurseryPlan {
  const user = authService.getCurrentUser();
  const plan = user?.plan as NurseryPlan | undefined;
  return plan ?? 'standard';
}

export function usePlanFeatures() {
  const plan = useNurseryPlan();

  return {
    plan,
    canManageTeamMembers: plan === 'platinum',
    canUploadVideo: plan === 'platinum',
    canApproveRejectReviews: plan === 'platinum',
    maxNurseries: plan === 'platinum' ? Infinity : 1,
  };
}
