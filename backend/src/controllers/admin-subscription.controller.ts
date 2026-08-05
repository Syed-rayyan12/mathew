/**
 * Ending a subscription.
 *
 * Admin-only by decision: there is no self-serve cancellation and no Stripe
 * Billing Portal, because the 90 days' written notice on the Checkout button
 * is a real term and someone has to check it was given.
 *
 * Both actions write through Stripe and then reconcile, so the local columns
 * are never guessed at — the webhook would arrive and say the same thing.
 */

import { NextFunction, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware';
import { getStripe } from '../utils/stripe';
import { clearSubscription, reconcileFromSubscription } from '../utils/subscription-sync';
import { cancellationEndDate } from '../utils/pricing';

/**
 * The earliest this subscription may end.
 *
 * Two clocks, and the later one wins: the twelve-month minimum term, and
 * ninety days from the date notice was served. An account with no recorded
 * notice is treated as serving it now, which is what happens when an owner
 * phones in and an admin acts on the spot.
 */
export const floorFor = (
  minimumTermEnd: Date | null,
  noticeServedAt: Date | null,
): Date => cancellationEndDate(minimumTermEnd, noticeServedAt ?? new Date());

type SubscriptionFound =
  | {
      ok: true;
      user: {
        id: string;
        stripeSubscriptionId: string;
        minimumTermEnd: Date | null;
        noticeServedAt: Date | null;
      };
      subscriptionId: string;
    }
  | { ok: false; status: number; message: string };

async function subscriptionFor(userId: string): Promise<SubscriptionFound> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      stripeSubscriptionId: true,
      minimumTermEnd: true,
      noticeServedAt: true,
    },
  });
  if (!user) return { ok: false, status: 404, message: 'User not found.' };
  if (!user.stripeSubscriptionId) {
    return { ok: false, status: 409, message: 'This account has no subscription to cancel.' };
  }
  return {
    ok: true,
    user: {
      id: user.id,
      stripeSubscriptionId: user.stripeSubscriptionId,
      minimumTermEnd: user.minimumTermEnd,
      noticeServedAt: user.noticeServedAt,
    },
    subscriptionId: user.stripeSubscriptionId,
  };
}

/**
 * POST /api/admin/subscriptions/:userId/schedule-cancellation
 *
 * Billing continues until the date, then the subscription ends and the
 * listings come down on their own. Defaults to 90 days out, which is the
 * notice period; an explicit date is allowed because notice may have been
 * given weeks ago.
 */
export const scheduleCancellation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const found = await subscriptionFor(req.params.userId);
    if (!found.ok) {
      return res.status(found.status).json({ success: false, message: found.message });
    }

    const floor = floorFor(found.user.minimumTermEnd, found.user.noticeServedAt);
    const requested = req.body?.cancelAt ? new Date(req.body.cancelAt) : floor;
    const override = req.body?.override === true;

    if (Number.isNaN(requested.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }

    if (requested <= new Date()) {
      return res.status(409).json({
        success: false,
        message: 'A scheduled cancellation must be in the future. Use "cancel immediately" instead.',
      });
    }

    // Below the floor is a real decision, not a typo — it waives either the
    // term or the notice period, so it has to be asked for explicitly.
    if (requested < floor && !override) {
      return res.status(409).json({
        success: false,
        code: 'BELOW_TERM_FLOOR',
        message: `The earliest this subscription may end is ${floor.toISOString().slice(0, 10)}. Pass override to end it sooner.`,
        data: { floor: floor.toISOString() },
      });
    }

    await getStripe().subscriptions.update(found.subscriptionId, {
      cancel_at: Math.floor(requested.getTime() / 1000),
    });

    await prisma.user.update({
      where: { id: found.user.id },
      data: {
        noticeStatus: 'confirmed',
        // An admin acting without a recorded request is themselves the record.
        ...(found.user.noticeServedAt ? {} : { noticeServedAt: new Date() }),
      },
    });

    const snapshot = await reconcileFromSubscription(found.subscriptionId, found.user.id);

    res.json({
      success: true,
      data: { subscriptionStatus: snapshot.subscriptionStatus, cancelAt: snapshot.cancelAt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/subscriptions/:userId/cancel-now
 *
 * For disputes and refunds. Listings come down immediately; the data stays and
 * the account can be reactivated with a fresh Checkout.
 */
export const cancelImmediately = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const found = await subscriptionFor(req.params.userId);
    if (!found.ok) {
      return res.status(found.status).json({ success: false, message: found.message });
    }

    const cancelled = await getStripe().subscriptions.cancel(found.subscriptionId);
    await clearSubscription(found.user.id, cancelled.status);

    res.json({ success: true, data: { subscriptionStatus: cancelled.status, cancelAt: null } });
  } catch (error) {
    next(error);
  }
};
