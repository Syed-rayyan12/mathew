import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';
import { features, isLive, planLabel, type PlanFeatures } from '../utils/entitlements';

/**
 * Blocks a route unless the account's tier unlocks the named feature.
 *
 * These are gated in the dashboard UI too, but the UI reads the plan from
 * localStorage, so the UI check is a convenience and this is the actual gate.
 *
 * ADMIN passes through — admins act on behalf of any account.
 */
export function requireFeature(feature: keyof PlanFeatures) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (req.user?.role === 'ADMIN') return next();

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, paidNurseryCount: true, subscriptionStatus: true },
    });

    if (!account) {
      return res.status(401).json({ success: false, message: 'Account not found.' });
    }

    // Asked before the feature check on purpose: "your subscription has ended"
    // is the true and useful answer for a lapsed Platinum account, where
    // "available on the Platinum plan" would be a lie.
    if (!isLive(account)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        status: account.subscriptionStatus,
        message: 'Your subscription is not active. Reactivate your plan to use this feature.',
      });
    }

    if (!features(account)[feature]) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_NOT_IN_PLAN',
        feature,
        planLabel: planLabel(account),
        message: 'This feature is available on the Platinum plan.',
      });
    }

    next();
  };
}
