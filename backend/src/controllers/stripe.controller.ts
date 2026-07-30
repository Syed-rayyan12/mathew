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
import {
  SubscriptionShapeError,
  clearSubscription,
  reconcileFromSubscription,
} from '../utils/subscription-sync';
import { planFromMetadata } from '../utils/entitlements';

/** True if a unique-key insert lost the race, i.e. this work already landed. */
function isAlreadyProcessed(err: any): boolean {
  return err?.code === 'P2002';
}

/**
 * The user id this Checkout Session belongs to, creating the account on the
 * first sighting.
 *
 * The insert into processed_checkout_sessions is the claim: the primary key is
 * the Stripe session id, so the webhook and the success redirect cannot both
 * create the account. That is now all this table does — plan state comes from
 * the subscription, which is idempotent on its own.
 *
 * Returns null when the session carries nothing that identifies an account.
 */
async function ensureAccount(session: any): Promise<string | null> {
  const meta = session.metadata;

  // Upgrade and reactivation sessions change an existing account and create
  // nothing.
  if (meta?.upgrade === 'true' && meta.userId) return meta.userId;

  if (!meta?.email) return null;

  const slug = String(meta.nurseryName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const groupId = await generateShortId('GRP');

  // Existing nursery owner buying a second group.
  if (meta.existingUserId) {
    try {
      await prisma.$transaction(async (tx: any) => {
        await tx.processedCheckoutSession.create({
          data: {
            id: session.id,
            userId: meta.existingUserId,
            planTier: 'pending',
            nurseryCount: 0,
          },
        });
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
      });
    } catch (err) {
      if (!isAlreadyProcessed(err)) throw err;
    }
    return meta.existingUserId;
  }

  const existing = await prisma.user.findUnique({ where: { email: meta.email } });
  if (existing) return existing.id;

  const userId = await generateShortId('USR');

  try {
    await prisma.$transaction(async (tx: any) => {
      await tx.processedCheckoutSession.create({
        data: { id: session.id, userId, planTier: 'pending', nurseryCount: 0 },
      });
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
          isActive: false,
          isOnline: true,
        },
      });
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
    return userId;
  } catch (err) {
    if (!isAlreadyProcessed(err)) throw err;
    // The other racer created it. Read back whichever id won.
    const winner = await prisma.user.findUnique({ where: { email: meta.email } });
    return winner?.id ?? null;
  }
}

/**
 * Standalone reconciler for callers that have nothing else to write.
 * Returns false when the session had already been applied.
 * @deprecated Task 8 will replace verifySession and verifyUpgradeSession.
 */
async function reconcileAccount(
  sessionId: string,
  userId: string,
  tier: PlanTier,
  paidNurseryCount: number
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx: any) => {
      await tx.processedCheckoutSession.create({
        data: { id: sessionId, userId, planTier: tier, nurseryCount: paidNurseryCount },
      });
      await tx.user.update({
        where: { id: userId },
        data: { planTier: tier, paidNurseryCount },
      });
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
 *
 * Three events cover signup, upgrade, lapse and cancellation:
 *
 *   checkout.session.completed     an account bought or reactivated a plan
 *   customer.subscription.updated  quantity, price, status or renewal changed
 *   customer.subscription.deleted  it ended
 *
 * Every one of them re-fetches the subscription instead of trusting the
 * payload, because Stripe does not guarantee event ordering and a stale
 * `subscription.updated` could otherwise overwrite a newer one.
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

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;

      if (session.mode !== 'subscription') return res.json({ received: true });
      if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
        return res.json({ received: true });
      }

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        console.error('checkout.session.completed carried no subscription', session.id);
        return res.json({ received: true });
      }

      const userId = await ensureAccount(session);
      if (!userId) {
        console.error('No account could be resolved for session', session.id);
        return res.json({ received: true });
      }

      await reconcileFromSubscription(subscriptionId, userId);
      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const owner = await prisma.user.findUnique({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      // Not ours, or the signup webhook has not landed yet. If it is the
      // latter, that webhook reconciles from scratch anyway.
      if (owner) await reconcileFromSubscription(sub.id, owner.id);
      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const owner = await prisma.user.findUnique({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      // planTier and paidNurseryCount are left alone on purpose — admin still
      // needs to see that a lapsed account bought a Group of eight.
      if (owner) await clearSubscription(owner.id, sub.status);
      return res.json({ received: true });
    }
  } catch (err) {
    if (err instanceof SubscriptionShapeError) {
      // A subscription this application could not have sold. Retrying will
      // not fix it, so acknowledge and let it be investigated by hand.
      console.error('❌ Unrecognised subscription shape:', err.message);
      return res.json({ received: true });
    }
    // Anything else — a database blip, a Stripe timeout — is worth retrying.
    // Stripe backs off for up to three days, which is long enough for someone
    // to notice, and every retry re-reads current truth.
    console.error(`❌ Webhook ${event.type} failed:`, err);
    return res.status(500).json({ received: false });
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
