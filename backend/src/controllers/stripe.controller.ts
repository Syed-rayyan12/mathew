import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { config } from '../config';
import { hashPassword } from '../utils';
import { generateShortId } from '../utils/id-generator';
import { ensurePlanPrices, ensurePlanProducts, getStripe } from '../utils/stripe';
import {
  quote,
  describeQuote,
  PricingError,
  type PlanTier,
  type BillingPeriod,
} from '../utils/pricing';
import { planFromMetadata } from '../utils/entitlements';

/**
 * Writes what was just bought onto the account, claiming the session first.
 *
 * The insert into processed_checkout_sessions is the whole mechanism: the
 * primary key is the Stripe session id, so the first caller wins and every
 * later one hits a unique violation. That covers three things at once —
 * the webhook racing the success redirect, Stripe retrying a webhook, and
 * someone re-posting an old session id to a `verify-*` endpoint to restore an
 * allowance they have since downgraded away from.
 *
 * Must be called inside a transaction so the claim and the account write
 * commit together.
 */
async function applyPurchase(
  tx: any,
  sessionId: string,
  userId: string,
  tier: PlanTier,
  paidNurseryCount: number
): Promise<void> {
  await tx.processedCheckoutSession.create({
    data: { id: sessionId, userId, planTier: tier, nurseryCount: paidNurseryCount },
  });
  await tx.user.update({
    where: { id: userId },
    data: { planTier: tier, paidNurseryCount },
  });
}

/** True if this call applied the purchase, false if it had already landed. */
function isAlreadyProcessed(err: any): boolean {
  return err?.code === 'P2002';
}

/**
 * Standalone form of applyPurchase for callers that have nothing else to write.
 * Returns false when the session had already been applied.
 */
async function reconcileAccount(
  sessionId: string,
  userId: string,
  tier: PlanTier,
  paidNurseryCount: number
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx: any) => {
      await applyPurchase(tx, sessionId, userId, tier, paidNurseryCount);
    });
    return true;
  } catch (err) {
    if (isAlreadyProcessed(err)) return false;
    throw err;
  }
}


/**
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe Checkout Session and returns the URL.
 * The signup form data is stored in the session metadata so
 * the webhook can create the account after payment succeeds.
 */
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, phone, nurseryName, city, town, plan, billingPeriod, nurseryCount } = req.body;

    // Validate required fields before creating checkout
    if (!email || !password || !firstName || !lastName || !phone || !nurseryName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.',
      });
    }

    const billing: BillingPeriod = billingPeriod === 'annual' ? 'annual' : 'monthly';
    const tier: PlanTier = plan === 'platinum' ? 'platinum' : 'standard';

    // The client sends how many nurseries it wants, never the price. Everything
    // charged is derived here so a tampered request can't buy a group cheaply.
    const requestedCount = Number(nurseryCount);
    const count = Number.isFinite(requestedCount) && requestedCount > 0
      ? Math.floor(requestedCount)
      : 1;

    let priceQuote;
    try {
      priceQuote = quote(tier, billing, count);
    } catch (err) {
      if (err instanceof PricingError) {
        return res.status(400).json({ success: false, message: err.message });
      }
      throw err;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role !== 'NURSERY_OWNER') {
        // Non-nursery accounts (parents, admins) cannot sign up as nursery owners
        return res.status(409).json({
          success: false,
          message: 'This email is already registered. Please use a different email or sign in.',
        });
      }
      // Existing nursery owner — allow them to create a new nursery group
    }

    if (existingUser) {
      const hasGroup = await prisma.group.findFirst({
        where: { ownerId: existingUser.id },
        select: { id: true },
      });
      if (hasGroup) {
        return res.status(409).json({
          success: false,
          code: 'GROUP_ALREADY_EXISTS',
          message:
            'This account already has a nursery group. Add nurseries or change plan from your dashboard.',
        });
      }
    }

    // Hash the password only for new accounts (not needed for existing users)
    const hashedPassword = existingUser ? '' : await hashPassword(password);

    const stripe = getStripe();
    // Verified here rather than at boot: a Stripe blip should not take the
    // public site down to protect a path nobody is mid-way through. A
    // mismatch between pricing.ts and the catalogue blocks checkout and
    // leaves the site up.
    const prices = await ensurePlanPrices();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      customer_email: email,
      // A catalogue Price, not price_data. Inline prices are one-time use and
      // cannot be updated, and subscriptions.update takes a Price id — so an
      // in-place upgrade later is only possible if the subscription starts on
      // a real Price. Quantity is the nursery count; Stripe derives the rate
      // from the volume ladder.
      line_items: [
        {
          price: prices[tier][billing],
          quantity: priceQuote.quantity,
        },
      ],
      metadata: {
        firstName,
        lastName,
        email,
        phone,
        nurseryName,
        city: city || '',
        town: town || '',
        hashedPassword,
        existingUserId: existingUser?.id || '',
      },
      custom_text: {
        submit: {
          message: billing === 'annual'
            ? '⚠️ Annual recurring payment — paid upfront each year. 90 days written notice required before renewal date to cancel. By completing payment you agree to these terms.'
            : '⚠️ Monthly recurring payment. 90 days written notice required before renewal date to cancel. By completing payment you agree to these terms.',
        },
      },
      success_url: `${config.frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/payment-cancelled`,
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error('❌ createCheckoutSession error:', error?.message || error);
    // Return structured error so frontend can display a message
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create checkout session. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events. On checkout.session.completed,
 * creates the nursery owner + group from the session metadata.
 */
export const stripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body, // raw body (Buffer)
      sig,
      config.stripe.webhookSecret
    );
  } catch (err: any) {
    console.error('⚠️ Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;

    // Only process if payment was successful
    if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
      return res.json({ received: true });
    }

    const meta = session.metadata;

    // Upgrade sessions carry a userId and no email — they change an existing
    // account's plan and create nothing. Without this branch the upgrade only
    // lands if the customer's browser makes it back to the success page.
    if (meta?.upgrade === 'true' && meta.userId) {
      const { tier, count } = planFromMetadata(meta);
      try {
        await reconcileAccount(session.id, meta.userId, tier, count);
      } catch (err) {
        console.error('❌ Error applying upgrade from webhook:', err);
      }
      return res.json({ received: true });
    }

    if (!meta || !meta.email) {
      console.error('No metadata found on checkout session');
      return res.json({ received: true });
    }

    try {
      const groupId = await generateShortId('GRP');

      if (meta.existingUserId) {
        // Existing nursery owner adding a new nursery group
        const slug = meta.nurseryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const { tier, count } = planFromMetadata(meta);

        await prisma.$transaction(async (tx: any) => {
          await tx.group.create({
            data: {
              id: groupId,
              name: meta.nurseryName,
              slug,
              email: meta.email,
              phone: meta.phone,
              firstName: meta.firstName,
              lastName: meta.lastName,
              city: meta.city || '',
              town: meta.town || null,
              ownerId: meta.existingUserId,
            },
          });

          await applyPurchase(tx, session.id, meta.existingUserId, tier, count);
        });

      } else {
        // New user — check idempotency first
        const alreadyExists = await prisma.user.findUnique({
          where: { email: meta.email },
        });

        if (alreadyExists) {
          return res.json({ received: true });
        }

      const userId = await generateShortId('USR');

      const { tier, count } = planFromMetadata(meta);

      await prisma.$transaction(async (tx: any) => {
        await tx.user.create({
          data: {
            id: userId,
            email: meta.email,
            password: meta.hashedPassword,
            firstName: meta.firstName,
            lastName: meta.lastName,
            phone: meta.phone,
            nurseryName: meta.nurseryName,
            role: 'NURSERY_OWNER',
            planTier: tier,
            paidNurseryCount: count,
            isActive: false,
            isOnline: true,
          },
        });

        const slug = meta.nurseryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        await tx.group.create({
          data: {
            id: groupId,
            name: meta.nurseryName,
            slug,
            email: meta.email,
            phone: meta.phone,
            firstName: meta.firstName,
            lastName: meta.lastName,
            city: meta.city || '',
            town: meta.town || null,
            ownerId: userId,
          },
        });

        // Claim the session here too, so the success redirect finds it already
        // applied instead of writing the plan a second time.
        await tx.processedCheckoutSession.create({
          data: { id: session.id, userId, planTier: tier, nurseryCount: count },
        });
      });

      }
    } catch (err) {
      if (isAlreadyProcessed(err)) {
        // The success redirect got here first. Nothing left to do.
        return res.json({ received: true });
      }
      console.error('❌ Error creating nursery account from webhook:', err);
      // Return 200 anyway so Stripe doesn't retry endlessly
    }
  }

  res.json({ received: true });
};

/**
 * POST /api/stripe/create-upgrade-session
 * Creates a Stripe Checkout Session for an existing nursery owner upgrading their plan.
 * Requires authentication. Only stores userId + new plan in metadata — no password.
 */
export const createUpgradeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as any;
    const userId: string = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorised.' });
    }

    const { plan, billingPeriod, nurseryCount } = req.body;

    const tier: PlanTier = plan === 'platinum' ? 'platinum' : 'standard';

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const billing: BillingPeriod = billingPeriod === 'annual' ? 'annual' : 'monthly';

    const requestedCount = Number(nurseryCount);
    const count = Number.isFinite(requestedCount) && requestedCount > 0
      ? Math.floor(requestedCount)
      : 0;

    // Buying exactly what you already have is not an upgrade.
    if (tier === user.planTier && count === user.paidNurseryCount) {
      return res.status(400).json({
        success: false,
        message: 'You are already on this plan.',
      });
    }

    // An allowance cannot be bought down below what is already in use, or the
    // owner would keep listings they have stopped paying for. Removing
    // nurseries first is the supported way down.
    const inUse = await prisma.nursery.count({ where: { ownerId: userId } });
    if (count < inUse) {
      return res.status(400).json({
        success: false,
        code: 'BELOW_CURRENT_USAGE',
        used: inUse,
        requested: count,
        message: `You currently have ${inUse} ${inUse === 1 ? 'nursery' : 'nurseries'}. Remove the ones you no longer need before reducing your plan.`,
      });
    }

    let priceQuote;
    try {
      priceQuote = quote(tier, billing, count);
    } catch (err) {
      if (err instanceof PricingError) {
        return res.status(400).json({ success: false, message: err.message });
      }
      throw err;
    }

    const lineItem = describeQuote(priceQuote);
    const stripe = getStripe();
    const products = await ensurePlanProducts();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      allow_promotion_codes: true,
      invoice_creation: {
        enabled: true,
        invoice_data: { description: lineItem.description },
      },
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product: products[tier],
            unit_amount: priceQuote.unitAmountPence,
          },
          quantity: priceQuote.quantity,
        },
      ],
      metadata: {
        upgrade: 'true',
        userId,
        plan: tier,
        billingPeriod: billing,
        nurseryCount: String(priceQuote.quantity),
      },
      custom_text: {
        submit: {
          message: billing === 'annual'
            ? '⚠️ Annual recurring payment — paid upfront each year. 90 days written notice required before renewal date to cancel. By completing payment you agree to these terms.'
            : '⚠️ Monthly recurring payment. 90 days written notice required before renewal date to cancel. By completing payment you agree to these terms.',
        },
      },
      success_url: `${config.frontendUrl}/nursery-dashboard/upgrade?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url: `${config.frontendUrl}/nursery-dashboard/upgrade?cancelled=true`,
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('❌ createUpgradeSession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create upgrade session. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/verify-upgrade-session
 * Called after payment success on the upgrade page.
 * Updates the user's plan in the database.
 */
export const verifyUpgradeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || !['paid', 'no_payment_required'].includes(session.payment_status)) {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    const meta = session.metadata;
    if (!meta || meta.upgrade !== 'true' || !meta.userId) {
      return res.status(400).json({ success: false, message: 'Invalid session metadata.' });
    }

    // A session can only be applied by the account that bought it.
    const callerId: string | undefined = (req as any).user?.userId;
    if (!callerId || callerId !== meta.userId) {
      return res.status(403).json({ success: false, message: 'This payment belongs to another account.' });
    }

    const user = await prisma.user.findUnique({ where: { id: meta.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { tier, count } = planFromMetadata(meta);

    const applied = await reconcileAccount(session.id, meta.userId, tier, count);

    // Already applied — report what the account actually has, not what this
    // (possibly replayed) session said it should have.
    if (!applied) {
      return res.json({
        success: true,
        data: { planTier: user.planTier, paidNurseryCount: user.paidNurseryCount },
      });
    }

    return res.json({
      success: true,
      data: { planTier: tier, paidNurseryCount: count },
    });
  } catch (error: any) {
    console.error('❌ verifyUpgradeSession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify upgrade. Please contact support.',
    });
  }
};

/**
 * POST /api/stripe/verify-session
 * Called by the payment-success page with the Stripe session_id.
 * Retrieves the session from Stripe, then creates the user + group.
 * This is the PRIMARY account-creation path (webhooks are unreliable in some envs).
 */
export const verifySession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || !['paid', 'no_payment_required'].includes(session.payment_status)) {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    const meta = session.metadata;
    if (!meta || !meta.email) {
      return res.status(400).json({ success: false, message: 'Session metadata missing.' });
    }

    const { tier, count } = planFromMetadata(meta);

    // Idempotent — the webhook may have got here first. Still reconcile, so a
    // purchase always lands on the account even when creation was skipped.
    const existingUser = await prisma.user.findUnique({ where: { email: meta.email } });
    if (existingUser) {
      await reconcileAccount(session.id, existingUser.id, tier, count);
      return res.json({ success: true, alreadyExists: true });
    }

    const userId = await generateShortId('USR');
    const groupId = await generateShortId('GRP');

    await prisma.$transaction(async (tx: any) => {
      await tx.user.create({
        data: {
          id: userId,
          email: meta.email,
          password: meta.hashedPassword,
          firstName: meta.firstName,
          lastName: meta.lastName,
          phone: meta.phone,
          nurseryName: meta.nurseryName,
          role: 'NURSERY_OWNER',
          planTier: tier,
          paidNurseryCount: count,
          isActive: false,
          isOnline: true,
        },
      });

      const slug = meta.nurseryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+-$/g, '');

      await tx.group.create({
        data: {
          id: groupId,
          name: meta.nurseryName,
          slug,
          email: meta.email,
          phone: meta.phone,
          firstName: meta.firstName,
          lastName: meta.lastName,
          city: meta.city || '',
          town: meta.town || null,
          ownerId: userId,
        },
      });

      await tx.processedCheckoutSession.create({
        data: { id: session.id, userId, planTier: tier, nurseryCount: count },
      });
    });

    return res.json({ success: true, alreadyExists: false });
  } catch (error: any) {
    // The webhook won the race and created this account (or claimed this
    // session) between the lookup above and the write. The customer's account
    // exists either way, so this is a success from their side.
    if (isAlreadyProcessed(error)) {
      return res.json({ success: true, alreadyExists: true });
    }
    console.error('❌ verifySession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment. Please contact support.',
    });
  }
};
