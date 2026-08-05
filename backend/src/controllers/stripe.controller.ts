import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { config } from '../config';
import { hashPassword } from '../utils';
import { generateShortId } from '../utils/id-generator';
import { ensurePlanPrices, getStripe, ensureJobsAddonPrice } from '../utils/stripe';
import {
  quote,
  parseLookupKey,
  PricingError,
  type PlanTier,
  type BillingPeriod,
  JOBS_ADDON_MINIMUM_MONTHS,
  JOBS_ADDON_MONTHLY_PENCE,
  OFFER_TRIAL_DAYS,
  planMinimumTermEnd,
  cancellationEndDate,
  checkoutTerms,
} from '../utils/pricing';
import { isOfferEligible } from '../utils/offer';
import { isLive, planLabel, normaliseTier, hasJobsAddon } from '../utils/entitlements';
import {
  SubscriptionShapeError,
  clearSubscription,
  reconcileFromSubscription,
} from '../utils/subscription-sync';
import { reconcileJobsAddon, clearJobsAddon } from '../utils/jobs-addon-sync';

/** Thrown when a processedCheckoutSession insert finds the session already recorded. */
class AlreadyProcessed extends Error {}

/**
 * A2: Validates a proration timestamp before it is sent to Stripe.
 *
 * Pure function — exported so it can be unit-tested without Stripe or a DB.
 *
 * Rules:
 *   - must be a finite integer (seconds)
 *   - must not be more than 15 minutes old relative to nowSeconds
 *   - must fall within the subscription item's current period
 *     (>= periodStart and <= periodEnd)
 */
export function isUsableProrationDate(
  ts: unknown,
  periodStart: number,
  periodEnd: number,
  nowSeconds: number
): boolean {
  if (!Number.isFinite(ts) || !Number.isInteger(ts)) return false;
  const t = ts as number;
  if (t > nowSeconds) return false;               // must not be in the future
  if (nowSeconds - t > 15 * 60) return false;     // must not be more than 15 min old
  if (t < periodStart) return false;              // must be within the period
  if (t > periodEnd) return false;
  return true;
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

  // A3b: unique the group slug before the transaction so collisions between
  // different owners with the same nursery name do not collapse onto one slug.
  // The constraint remains the real guard; this is best-effort.
  const baseSlug = String(meta.nurseryName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  async function resolveSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    while (await prisma.group.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  const groupId = await generateShortId('GRP');

  // Existing nursery owner buying a second group.
  if (meta.existingUserId) {
    const slug = await resolveSlug(baseSlug);
    try {
      await prisma.$transaction(async (tx: any) => {
        // A3a: wrap only the idempotency claim; other P2002s (e.g. group slug)
        // now propagate and make the webhook return 500 → Stripe retries.
        try {
          await tx.processedCheckoutSession.create({
            data: {
              id: session.id,
              userId: meta.existingUserId,
              planTier: 'pending',
              nurseryCount: 0,
            },
          });
        } catch (err: any) {
          if (err?.code === 'P2002') throw new AlreadyProcessed();
          throw err;
        }
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
      if (!(err instanceof AlreadyProcessed)) throw err;
    }
    return meta.existingUserId;
  }

  const existing = await prisma.user.findUnique({ where: { email: meta.email } });
  if (existing) return existing.id;

  const userId = await generateShortId('USR');
  const slug = await resolveSlug(baseSlug);

  try {
    await prisma.$transaction(async (tx: any) => {
      // A3a: wrap only the idempotency claim.
      try {
        await tx.processedCheckoutSession.create({
          data: { id: session.id, userId, planTier: 'pending', nurseryCount: 0 },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') throw new AlreadyProcessed();
        throw err;
      }
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
    if (!(err instanceof AlreadyProcessed)) throw err;
    // The other racer created it. Read back whichever id won.
    const winner = await prisma.user.findUnique({ where: { email: meta.email } });
    return winner?.id ?? null;
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
    const { email, password, firstName, lastName, phone, nurseryName, city, town, plan, billingPeriod, nurseryCount, offerCode } = req.body;

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

    // The client may claim any code; eligibility is decided here. An
    // ineligible claim is not an error — it just means full price.
    const offerApplies = isOfferEligible(offerCode);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      ...(offerApplies
        ? { subscription_data: { trial_period_days: OFFER_TRIAL_DAYS } }
        : {}),
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
        offerCode: offerApplies ? String(offerCode) : '',
      },
      custom_text: { submit: { message: checkoutTerms(billing) } },
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

      // ── Jobs add-on branch — MUST come before ensureAccount ──────────────
      if (session.metadata?.mathew_purpose === 'jobs_addon') {
        const addonUserId = session.metadata.userId;
        if (!addonUserId) {
          console.error('Jobs add-on session has no userId in metadata', session.id);
          return res.json({ received: true });
        }

        // Set minimum term end if not already set
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const createdDate = new Date(sub.created * 1000);
        const minimumTermEnd = new Date(createdDate);
        minimumTermEnd.setMonth(minimumTermEnd.getMonth() + JOBS_ADDON_MINIMUM_MONTHS);

        // Only set minimumTermEnd if it hasn't been set yet (idempotent)
        await prisma.user.updateMany({
          where: { id: addonUserId, jobsAddonMinimumTermEnd: null },
          data: { jobsAddonMinimumTermEnd: minimumTermEnd },
        });

        await reconcileJobsAddon(subscriptionId, addonUserId);
        return res.json({ received: true });
      }

      const userId = await ensureAccount(session);
      if (!userId) {
        console.error('No account could be resolved for session', session.id);
        return res.json({ received: true });
      }

      // The twelve-month term runs from when the subscription was created,
      // trial or not — the trial is inside the term, not before it. Written
      // once: updateMany with a null guard is what makes the webhook and any
      // redelivery agree, matching the jobs add-on above.
      const planSub = await getStripe().subscriptions.retrieve(subscriptionId);
      await prisma.user.updateMany({
        where: { id: userId, minimumTermEnd: null },
        data: {
          minimumTermEnd: planMinimumTermEnd(new Date(planSub.created * 1000)),
          ...(session.metadata?.offerCode
            ? { offerCode: session.metadata.offerCode }
            : {}),
        },
      });

      await reconcileFromSubscription(subscriptionId, userId);

      // If the plan is now Platinum, cancel any jobs add-on
      const account = await prisma.user.findUnique({
        where: { id: userId },
        select: { planTier: true },
      });
      if (account && normaliseTier(account.planTier) === 'platinum') {
        await cancelJobsAddonOnPlatinum(userId);
      }

      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const owner = await prisma.user.findUnique({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      if (owner) {
        await reconcileFromSubscription(sub.id, owner.id);
        return res.json({ received: true });
      }

      // Check if it's a jobs add-on subscription
      const addonOwner = await prisma.user.findUnique({
        where: { jobsAddonSubscriptionId: sub.id },
        select: { id: true },
      });
      if (addonOwner) await reconcileJobsAddon(sub.id, addonOwner.id);
      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const owner = await prisma.user.findUnique({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      if (owner) {
        await clearSubscription(owner.id, sub.status);
        return res.json({ received: true });
      }

      // Check if it's a jobs add-on subscription
      const addonOwner = await prisma.user.findUnique({
        where: { jobsAddonSubscriptionId: sub.id },
        select: { id: true },
      });
      if (addonOwner) await clearJobsAddon(addonOwner.id, sub.status);
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

interface ChangeRequest {
  tier: PlanTier;
  billing: BillingPeriod;
  count: number;
}

type ChangeRejection = { status: number; body: Record<string, unknown> };

/**
 * Everything that must be true before a plan change can be priced.
 *
 * Shared by preview and apply so the confirmation screen cannot show a number
 * for something the apply call then refuses.
 *
 * A4: accepts an optional transaction client so applyChange can pass `tx` and
 * have the nursery count happen under the row-level lock. previewChange and
 * createUpgradeSession keep calling without one.
 */
async function validateChange(
  userId: string,
  body: any,
  txClient?: any
): Promise<{ ok: true; change: ChangeRequest } | { ok: false; rejection: ChangeRejection }> {
  const tier: PlanTier = body.plan === 'platinum' ? 'platinum' : 'standard';
  const billing: BillingPeriod = body.billingPeriod === 'annual' ? 'annual' : 'monthly';

  const requested = Number(body.nurseryCount);
  const count = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 0;

  const db = txClient ?? prisma;

  // An allowance cannot be bought down below what is already in use, or the
  // owner would keep listings they have stopped paying for. Removing
  // nurseries first is the supported way down.
  const inUse = await db.nursery.count({ where: { ownerId: userId } });
  if (count < inUse) {
    return {
      ok: false,
      rejection: {
        status: 400,
        body: {
          success: false,
          code: 'BELOW_CURRENT_USAGE',
          used: inUse,
          requested: count,
          message: `You currently have ${inUse} ${inUse === 1 ? 'nursery' : 'nurseries'}. Remove the ones you no longer need before reducing your plan.`,
        },
      },
    };
  }

  try {
    // Refuses a Standard group and refuses 61+. The tier ladder's `inf` tier
    // means Stripe itself would sell a group of 200 without this.
    quote(tier, billing, count);
  } catch (err) {
    if (err instanceof PricingError) {
      return { ok: false, rejection: { status: 400, body: { success: false, message: err.message } } };
    }
    throw err;
  }

  return { ok: true, change: { tier, billing, count } };
}

/**
 * POST /api/stripe/preview-change
 *
 * What this change costs right now and what it renews at. No charge, no
 * redirect — the upgrade page becomes a confirmation screen with real numbers.
 *
 * A2: computes and returns prorationDate so the apply call can pin Stripe to
 * the same second the preview was computed at.
 */
export const previewChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const validated = await validateChange(userId, req.body);
    if (!validated.ok) {
      return res.status(validated.rejection.status).json(validated.rejection.body);
    }
    const { tier, billing, count } = validated.change;
    const target = quote(tier, billing, count);

    // Nothing to update — never subscribed, or lapsed. Reactivation is a fresh
    // Checkout against the existing customer record.
    if (!user.stripeSubscriptionId || !isLive(user)) {
      return res.json({
        success: true,
        data: {
          requiresCheckout: true,
          amountDueNowPence: target.totalPence,
          nextRenewalPence: target.totalPence,
          nextRenewalDate: null,
          intervalChanges: false,
          currency: 'gbp',
          targetLabel: planLabel({ planTier: tier, paidNurseryCount: count }),
        },
      });
    }

    const stripe = getStripe();
    const prices = await ensurePlanPrices();
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const item = sub.items.data[0];

    if (!item) {
      return res.status(409).json({
        success: false,
        message: 'Your subscription is in an unexpected state. Please contact support.',
      });
    }

    const current = parseLookupKey(item.price?.lookup_key);
    if (tier === current?.tier && billing === current?.billing && count === item.quantity) {
      return res.status(400).json({ success: false, message: 'You are already on this plan.' });
    }

    // A2: pin the proration timestamp so preview and apply use the same second.
    const prorationDate = Math.floor(Date.now() / 1000);

    const preview = await stripe.invoices.createPreview({
      customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      subscription: sub.id,
      subscription_details: {
        // The item id must be passed or Stripe adds a second line rather than
        // changing the one that is there. Quantity must be passed explicitly
        // too: Stripe resets it to 1 whenever an item's price changes, which
        // is exactly what a Standard → Platinum move does.
        items: [{ id: item.id, price: prices[tier][billing], quantity: count }],
        proration_behavior: 'always_invoice',
        proration_date: prorationDate,
      },
    });

    // Changing the interval resets the billing cycle and charges immediately,
    // so the current period end stops being the answer to "when next".
    const intervalChanges = current !== null && current.billing !== billing;

    res.json({
      success: true,
      data: {
        requiresCheckout: false,
        amountDueNowPence: preview.amount_due,
        nextRenewalPence: target.totalPence,
        nextRenewalDate: intervalChanges
          ? null
          : item.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
        intervalChanges,
        currency: preview.currency ?? 'gbp',
        targetLabel: planLabel({ planTier: tier, paidNurseryCount: count }),
        // A2: returned so the frontend can pass it back to apply-change.
        prorationDate,
      },
    });
  } catch (error: any) {
    console.error('❌ previewChange error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Could not work out what that change would cost. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/apply-change
 *
 * Updates the subscription in place and charges the prorated difference to the
 * card on file.
 *
 * A declined charge is accepted as-is: `always_invoice` can fail after the
 * quantity has already changed, leaving the subscription past_due — which is
 * still live, so the owner briefly holds the larger allowance unpaid. Stripe
 * retries, and a final failure hides everything. Unwinding a quantity change
 * mid-flight is worse.
 *
 * A2: requires prorationDate from the preview response. Rejected if absent,
 * stale, or outside the current billing period — silently falling back to
 * "now" would reintroduce the defect.
 *
 * A4: takes a SELECT FOR UPDATE on the user row inside a transaction so this
 * path and createNursery serialise. The lock covers count → Stripe update;
 * reconcileFromSubscription is called after the transaction commits so its
 * write is never rolled back.
 */
export const applyChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (!user.stripeSubscriptionId || !isLive(user)) {
      return res.status(409).json({
        success: false,
        code: 'REQUIRES_CHECKOUT',
        message: 'There is no active subscription to change. Start a new one instead.',
      });
    }

    // A2: validate the proration timestamp before touching Stripe.
    const { prorationDate } = req.body;
    const stripe = getStripe();
    const prices = await ensurePlanPrices();

    // A4: hold a row-level lock across the nursery count and the Stripe call
    // so a concurrent createNursery cannot slip in between. Timeout raised to
    // 20 s because a Stripe round trip can exceed the 5 s default.
    //
    // Review fix 2: retrieve the subscription once, inside the transaction
    // after the lock is taken, so the period bounds used for proration-date
    // validation and the item id used for the update are read from the same
    // consistent snapshot. Reading bounds before the lock would allow a period
    // rollover between the two reads to validate against old bounds and submit
    // against new ones.
    const result = await prisma.$transaction(
      async (tx: any) => {
        await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;

        const validated = await validateChange(userId, req.body, tx);
        if (!validated.ok) {
          return { ok: false as const, rejection: validated.rejection };
        }
        const { tier, billing, count } = validated.change;

        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId!);
        const item = sub.items.data[0];

        if (!item) {
          return {
            ok: false as const,
            rejection: {
              status: 409,
              body: {
                success: false,
                message: 'Your subscription is in an unexpected state. Please contact support.',
              },
            },
          };
        }

        // A2 + review fix 2: validate the proration date here, inside the
        // lock, against the period bounds from this single retrieve. The
        // transaction rolls back cleanly if this returns a rejection — no
        // partial change is left behind.
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (
          !isUsableProrationDate(
            prorationDate,
            item.current_period_start,
            item.current_period_end,
            nowSeconds
          )
        ) {
          return {
            ok: false as const,
            rejection: {
              status: 409,
              body: {
                success: false,
                code: 'PREVIEW_EXPIRED',
                message: 'Your plan change quote has expired. Please review the change again.',
              },
            },
          };
        }

        const updated = await stripe.subscriptions.update(sub.id, {
          items: [{ id: item.id, price: prices[tier][billing], quantity: count }],
          proration_behavior: 'always_invoice',
          proration_date: prorationDate,
        });

        return { ok: true as const, updatedId: updated.id };
      },
      { timeout: 20000 }
    );

    if (!result.ok) {
      return res.status(result.rejection.status).json(result.rejection.body);
    }

    // reconcileFromSubscription writes with the global client — intentionally
    // outside the transaction so its write is never rolled back by a later failure.
    const snapshot = await reconcileFromSubscription(result.updatedId, userId);

    if (normaliseTier(snapshot.planTier) === 'platinum') {
      await cancelJobsAddonOnPlatinum(userId);
    }

    res.json({
      success: true,
      data: {
        planTier: snapshot.planTier,
        paidNurseryCount: snapshot.paidNurseryCount,
        subscriptionStatus: snapshot.subscriptionStatus,
      },
    });
  } catch (error: any) {
    console.error('❌ applyChange error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Could not apply that change. Your plan has not been altered. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/create-upgrade-session
 *
 * Checkout for an account with no live subscription — never subscribed, or
 * lapsed. An account that *has* one uses apply-change instead, which needs no
 * redirect.
 *
 * A1a: explicitly rejects when the account already has a live subscription,
 * so a live owner cannot accidentally create a second one by POSTing here.
 *
 * Reused rather than replaced so a reactivating owner keeps their Stripe
 * customer record, and with it their payment methods and invoice history.
 */
export const createUpgradeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // A1a: refuse when the account already has a live subscription — apply-change
    // is the correct path for that case and needs no redirect.
    if (user.stripeSubscriptionId && isLive(user)) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_SUBSCRIBED',
        message: 'This account already has an active subscription. Change it from your plan page instead.',
      });
    }

    const validated = await validateChange(userId, req.body);
    if (!validated.ok) {
      return res.status(validated.rejection.status).json(validated.rejection.body);
    }
    const { tier, billing, count } = validated.change;

    const stripe = getStripe();
    const prices = await ensurePlanPrices();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      line_items: [{ price: prices[tier][billing], quantity: count }],
      metadata: { upgrade: 'true', userId },
      custom_text: { submit: { message: checkoutTerms(billing) } },
      success_url: `${config.frontendUrl}/nursery-dashboard/upgrade?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url: `${config.frontendUrl}/nursery-dashboard/upgrade?cancelled=true`,
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('❌ createUpgradeSession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create checkout session. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/verify-upgrade-session
 *
 * The success redirect after a reactivation Checkout. Exists because the
 * webhook is not instant and the owner is looking at the page now.
 *
 * Replay is no longer a concern: this reconciles from the subscription, so
 * re-posting an old session id re-reads current truth and writes the same
 * values. The caller check stays because a session id is not a secret.
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

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const meta = session.metadata;

    if (!meta || meta.upgrade !== 'true' || !meta.userId) {
      return res.status(400).json({ success: false, message: 'Invalid session metadata.' });
    }

    const callerId: string | undefined = (req as any).user?.userId;
    if (!callerId || callerId !== meta.userId) {
      return res.status(403).json({ success: false, message: 'This payment belongs to another account.' });
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (!subscriptionId) {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    const snapshot = await reconcileFromSubscription(subscriptionId, meta.userId);

    if (normaliseTier(snapshot.planTier) === 'platinum') {
      await cancelJobsAddonOnPlatinum(meta.userId);
    }

    return res.json({
      success: true,
      data: {
        planTier: snapshot.planTier,
        paidNurseryCount: snapshot.paidNurseryCount,
      },
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
 *
 * Called by the payment-success page. This and the webhook race to create the
 * account; processed_checkout_sessions decides which one wins, and both then
 * reconcile the same subscription to the same values.
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

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (!session || !['paid', 'no_payment_required'].includes(session.payment_status)) {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (!subscriptionId) {
      return res.status(400).json({ success: false, message: 'Session carried no subscription.' });
    }

    const existedBefore = session.metadata?.email
      ? Boolean(await prisma.user.findUnique({ where: { email: session.metadata.email } }))
      : true;

    const userId = await ensureAccount(session);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Session metadata missing.' });
    }

    await reconcileFromSubscription(subscriptionId, userId);

    return res.json({ success: true, alreadyExists: existedBefore });
  } catch (error: any) {
    console.error('❌ verifySession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment. Please contact support.',
    });
  }
};

// ── Jobs add-on ──────────────────────────────────────────────────────────────

/**
 * Best-effort cleanup: if the account just became Platinum and had a live
 * add-on, cancel it immediately. Swallowed on failure — the upgrade's money
 * has already been taken and must not be reported as failed.
 */
async function cancelJobsAddonOnPlatinum(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jobsAddonSubscriptionId: true, jobsAddonStatus: true },
    });
    if (!user?.jobsAddonSubscriptionId || !hasJobsAddon(user)) return;

    await getStripe().subscriptions.cancel(user.jobsAddonSubscriptionId, {
      prorate: false,
    } as any);
    await clearJobsAddon(userId, 'canceled');
    console.log(`🧹 Cancelled jobs add-on for user ${userId} on Platinum upgrade`);
  } catch (err: any) {
    // Loud log, swallowed error. The next webhook or a manual check fixes it.
    console.error(`❌ Failed to cancel jobs add-on on Platinum upgrade for ${userId}:`, err?.message || err);
  }
}

/**
 * POST /api/stripe/jobs-addon/checkout
 *
 * Creates a Stripe Checkout session for the £6.99/mo jobs add-on.
 * Guards: main plan live, tier is standard, no active add-on already.
 */
export const jobsAddonCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const result = await prisma.$transaction(async (tx: any) => {
      // Lock the user row to prevent concurrent checkout sessions
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          stripeCustomerId: true,
          subscriptionStatus: true,
          planTier: true,
          jobsAddonStatus: true,
          jobsAddonSubscriptionId: true,
        },
      });

      if (!user) return { ok: false as const, status: 404, body: { success: false, message: 'User not found.' } };

      if (!isLive(user)) {
        return { ok: false as const, status: 403, body: { success: false, code: 'SUBSCRIPTION_INACTIVE', message: 'Your subscription is not active. Reactivate your plan first.' } };
      }

      if (normaliseTier(user.planTier) === 'platinum') {
        return { ok: false as const, status: 409, body: { success: false, code: 'ALREADY_INCLUDED', message: 'Job posting is already included in your Platinum plan.' } };
      }

      // Check both mirrored status AND subscription ID to catch pending sessions
      if (hasJobsAddon(user) || user.jobsAddonSubscriptionId) {
        return { ok: false as const, status: 409, body: { success: false, code: 'ADDON_ALREADY_ACTIVE', message: 'You already have an active jobs add-on.' } };
      }

      if (!user.stripeCustomerId) {
        return { ok: false as const, status: 409, body: { success: false, message: 'No Stripe customer found. Please contact support.' } };
      }

      return { ok: true as const, stripeCustomerId: user.stripeCustomerId };
    }, { timeout: 10000 });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const priceId = await ensureJobsAddonPrice();

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: result.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        mathew_purpose: 'jobs_addon',
        userId,
      },
      subscription_data: {
        metadata: { mathew_purpose: 'jobs_addon' },
      },
      custom_text: {
        submit: {
          message: `⚠️ Monthly recurring payment of £${(JOBS_ADDON_MONTHLY_PENCE / 100).toFixed(2)}. Minimum commitment of ${JOBS_ADDON_MINIMUM_MONTHS} months. By completing payment you agree to these terms.`,
        },
      },
      success_url: `${config.frontendUrl}/nursery-dashboard/jobs?addon_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/nursery-dashboard/jobs`,
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('❌ jobsAddonCheckout error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start checkout. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/jobs-addon/verify-session
 *
 * Called by the success redirect. Reconciles and is idempotent — racing the
 * webhook is harmless.
 */
export const jobsAddonVerifySession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID is required.' });

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const meta = session.metadata;

    if (!meta || meta.mathew_purpose !== 'jobs_addon' || !meta.userId) {
      return res.status(400).json({ success: false, message: 'Invalid session metadata.' });
    }

    const callerId: string | undefined = (req as any).user?.userId;
    if (!callerId || callerId !== meta.userId) {
      return res.status(403).json({ success: false, message: 'This payment belongs to another account.' });
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (!subscriptionId) {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    // Set the minimum term end date from the subscription's created timestamp
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    const createdDate = new Date(sub.created * 1000);
    const minimumTermEnd = new Date(createdDate);
    minimumTermEnd.setMonth(minimumTermEnd.getMonth() + JOBS_ADDON_MINIMUM_MONTHS);

    // Only set minimumTermEnd if it hasn't been set yet (idempotent — matches
    // the webhook handler). The spec says "written once, never recomputed".
    await prisma.user.updateMany({
      where: { id: meta.userId, jobsAddonMinimumTermEnd: null },
      data: { jobsAddonMinimumTermEnd: minimumTermEnd },
    });

    await reconcileJobsAddon(subscriptionId, meta.userId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('❌ jobsAddonVerifySession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify add-on payment. Please contact support.',
    });
  }
};

/**
 * POST /api/stripe/jobs-addon/cancel
 *
 * Schedules cancellation. Inside the minimum term, cancel_at is pinned to
 * the term end. Outside, cancel_at_period_end lets the current month finish.
 */
export const jobsAddonCancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        jobsAddonSubscriptionId: true,
        jobsAddonStatus: true,
        jobsAddonMinimumTermEnd: true,
      },
    });

    if (!user?.jobsAddonSubscriptionId || !hasJobsAddon(user)) {
      return res.status(409).json({
        success: false,
        message: 'No active jobs add-on to cancel.',
      });
    }

    const stripe = getStripe();
    const now = new Date();
    let endsAt: Date;

    if (user.jobsAddonMinimumTermEnd && now < user.jobsAddonMinimumTermEnd) {
      // Inside minimum term — cancel at the term end
      await stripe.subscriptions.update(user.jobsAddonSubscriptionId, {
        cancel_at: Math.floor(user.jobsAddonMinimumTermEnd.getTime() / 1000),
      });
      endsAt = user.jobsAddonMinimumTermEnd;
    } else {
      // Outside minimum term — cancel at end of current period
      await stripe.subscriptions.update(user.jobsAddonSubscriptionId, {
        cancel_at_period_end: true,
      });
      const sub = await stripe.subscriptions.retrieve(user.jobsAddonSubscriptionId);
      const item = sub.items.data[0];
      endsAt = new Date((item?.current_period_end ?? 0) * 1000);
    }

    // Re-sync so the dashboard shows the cancelAt immediately
    await reconcileJobsAddon(user.jobsAddonSubscriptionId, userId);

    res.json({
      success: true,
      data: { endsAt: endsAt.toISOString() },
    });
  } catch (error: any) {
    console.error('❌ jobsAddonCancel error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel add-on. Please try again.',
    });
  }
};

/**
 * POST /api/stripe/plan/request-cancellation
 *
 * Records that notice was served. Deliberately does not touch Stripe — an
 * admin confirms before anything is scheduled, because someone has to check
 * the notice was genuinely given. See admin-subscription.controller.ts.
 *
 * Idempotent by design: a second request returns the first noticeServedAt
 * rather than restarting the clock, so an owner cannot move their own end
 * date in either direction by clicking twice.
 */
export const requestPlanCancellation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        minimumTermEnd: true,
        noticeServedAt: true,
        noticeStatus: true,
      },
    });

    if (!user?.stripeSubscriptionId || !isLive(user)) {
      return res.status(409).json({
        success: false,
        message: 'No active subscription to cancel.',
      });
    }

    // First request wins. Re-reading rather than re-writing is the whole
    // point: the served date is evidence, not a mutable preference.
    const servedAt = user.noticeServedAt ?? new Date();

    if (!user.noticeServedAt) {
      await prisma.user.updateMany({
        where: { id: userId, noticeServedAt: null },
        data: { noticeServedAt: servedAt, noticeStatus: 'requested' },
      });
    }

    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { noticeServedAt: true, minimumTermEnd: true },
    });

    const effectiveServedAt = fresh?.noticeServedAt ?? servedAt;
    const endsAt = cancellationEndDate(fresh?.minimumTermEnd ?? null, effectiveServedAt);

    res.json({
      success: true,
      data: {
        noticeServedAt: effectiveServedAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ requestPlanCancellation error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record your cancellation request. Please try again.',
    });
  }
};
