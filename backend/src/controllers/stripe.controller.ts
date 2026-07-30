import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { config } from '../config';
import { hashPassword } from '../utils';
import { generateShortId } from '../utils/id-generator';
import { ensurePlanProducts, getStripe } from '../utils/stripe';
import {
  quote,
  describeQuote,
  PricingError,
  type PlanTier,
  type BillingPeriod,
} from '../utils/pricing';

/**
 * Writes what was just bought onto the account.
 *
 * Called from the webhook, verify-session and verify-upgrade-session, so a
 * purchase always lands even if only one of them fires. Idempotent: running it
 * twice with the same metadata is a no-op, which is exactly what happens when
 * the webhook and the success redirect race.
 */
async function reconcileAccount(
  tx: { user: { update: (args: any) => Promise<any> } },
  userId: string,
  tier: PlanTier,
  paidNurseryCount: number
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { planTier: tier, paidNurseryCount },
  });
}

/** Reads the tier and count back out of Stripe session metadata. */
function planFromMetadata(meta: Record<string, string | undefined>): {
  tier: PlanTier;
  count: number;
} {
  const tier: PlanTier = meta.plan === 'platinum' ? 'platinum' : 'standard';
  const parsed = Number(meta.nurseryCount);
  const count = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  return { tier, count };
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

    const lineItem = describeQuote(priceQuote);

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
    const products = await ensurePlanProducts();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      allow_promotion_codes: true,
      invoice_creation: {
        enabled: true,
        invoice_data: { description: lineItem.description },
      },
      customer_email: email,
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
        firstName,
        lastName,
        email,
        phone,
        nurseryName,
        city: city || '',
        town: town || '',
        hashedPassword,
        plan: tier,
        billingPeriod: billing,
        nurseryCount: String(priceQuote.quantity),
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

          await reconcileAccount(tx, meta.existingUserId, tier, count);
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
      });

      }
    } catch (err) {
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

    const user = await prisma.user.findUnique({ where: { id: meta.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { tier, count } = planFromMetadata(meta);

    await reconcileAccount(prisma, meta.userId, tier, count);

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
      await reconcileAccount(prisma, existingUser.id, tier, count);
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
    });

    return res.json({ success: true, alreadyExists: false });
  } catch (error: any) {
    console.error('❌ verifySession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment. Please contact support.',
    });
  }
};
