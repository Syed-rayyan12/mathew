import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { config } from '../config';
import { hashPassword } from '../utils';
import { generateShortId } from '../utils/id-generator';
import { ensurePlanProducts, getStripe } from '../utils/stripe';


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
    const { email, password, firstName, lastName, phone, nurseryName, city, town, plan, billingPeriod } = req.body;

    // Validate required fields before creating checkout
    if (!email || !password || !firstName || !lastName || !phone || !nurseryName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.',
      });
    }

    const billing = billingPeriod === 'annual' ? 'annual' : 'monthly';
    const PLAN_CONFIG = {
      standard: {
        monthly: { label: 'Standard Nursery Listing – Monthly', description: 'Monthly recurring payment: £23.95/month. Annual option: £287.40/year paid upfront. Recurring subscription — 90 days written notice required before renewal date to cancel.', unitAmount: 2395 },
        annual:  { label: 'Standard Nursery Listing – Annual',  description: 'Annual payment: £287.40/year (equivalent to £23.95/month) paid upfront. Recurring subscription — 90 days written notice required before renewal date to cancel.', unitAmount: 28740 },
      },
      platinum: {
        monthly: { label: 'Platinum Nursery Listing – Monthly', description: 'Monthly recurring payment: £38.60/month. Annual option: £463.20/year paid upfront. Recurring subscription — 90 days written notice required before renewal date to cancel.', unitAmount: 3860 },
        annual:  { label: 'Platinum Nursery Listing – Annual',  description: 'Annual payment: £463.20/year (equivalent to £38.60/month) paid upfront. Recurring subscription — 90 days written notice required before renewal date to cancel.', unitAmount: 46320 },
      },
    } as const;
    const planKey = (plan in PLAN_CONFIG) ? plan as keyof typeof PLAN_CONFIG : 'standard';
    const planConfig = PLAN_CONFIG[planKey][billing];

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

    // Hash the password only for new accounts (not needed for existing users)
    const hashedPassword = existingUser ? '' : await hashPassword(password);

    const stripe = getStripe();
    const products = await ensurePlanProducts();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      allow_promotion_codes: true,
      invoice_creation: { enabled: true },
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product: products[planKey],
            unit_amount: planConfig.unitAmount,
          },
          quantity: 1,
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
        plan: plan || 'standard',
        billingPeriod: billing,
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
      console.log('Payment not completed, skipping account creation');
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

        await prisma.group.create({
          data: {
            id: groupId,
            name: meta.nurseryName,
            slug,
            email: meta.email,
            phone: meta.phone,
            firstName: meta.firstName,
            lastName: meta.lastName,
            city: meta.city || null,
            town: meta.town || null,
            ownerId: meta.existingUserId,
          },
        });

        console.log(`✅ New nursery group created for existing owner ${meta.email} after payment`);
      } else {
        // New user — check idempotency first
        const alreadyExists = await prisma.user.findUnique({
          where: { email: meta.email },
        });

        if (alreadyExists) {
          console.log(`User ${meta.email} already exists, skipping creation`);
          return res.json({ received: true });
        }

      const userId = await generateShortId('USR');

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
            plan: meta.plan || 'standard',
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
            city: meta.city || null,
            town: meta.town || null,
            ownerId: userId,
          },
        });
      });

        console.log(`✅ Nursery owner account created for ${meta.email} after payment`);
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

    console.log('🔼 createUpgradeSession — userId from token:', userId);
    console.log('🔼 createUpgradeSession — Authorization header:', req.headers.authorization ? 'present' : 'MISSING');

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorised.' });
    }

    const { plan, billingPeriod } = req.body;

    if (!plan || plan !== 'platinum') {
      return res.status(400).json({ success: false, message: 'Invalid upgrade plan.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.plan === 'platinum') {
      return res.status(400).json({ success: false, message: 'You are already on the Platinum plan.' });
    }

    const billing = billingPeriod === 'annual' ? 'annual' : 'monthly';
    const UPGRADE_CONFIG = {
      monthly: { label: 'Platinum Nursery Listing – Monthly', description: 'Monthly recurring payment: £38.60/month. Annual option: £463.20/year paid upfront. Recurring subscription — 90 days written notice required before renewal date to cancel.', unitAmount: 3860 },
      annual:  { label: 'Platinum Nursery Listing – Annual',  description: 'Annual payment: £463.20/year (equivalent to £38.60/month) paid upfront. Recurring subscription — 90 days written notice required before renewal date to cancel.', unitAmount: 46320 },
    } as const;
    const planConfig = UPGRADE_CONFIG[billing];
    const stripe = getStripe();
    const products = await ensurePlanProducts();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      allow_promotion_codes: true,
      invoice_creation: { enabled: true },
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product: products.platinum,
            unit_amount: planConfig.unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        upgrade: 'true',
        userId,
        plan,
        billingPeriod: billing,
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

    await prisma.user.update({
      where: { id: meta.userId },
      data: { plan: meta.plan || 'platinum' },
    });

    console.log(`✅ Plan upgraded to ${meta.plan} for user ${meta.userId}`);
    return res.json({ success: true, data: { plan: meta.plan } });
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

    // Idempotent — skip if already created (e.g. webhook already ran)
    const existingUser = await prisma.user.findUnique({ where: { email: meta.email } });
    if (existingUser) {
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
          plan: meta.plan || 'standard',
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
          city: meta.city || null,
          town: meta.town || null,
          ownerId: userId,
        },
      });
    });

    console.log(`✅ Account created via session verification for ${meta.email}`);
    return res.json({ success: true, alreadyExists: false });
  } catch (error: any) {
    console.error('❌ verifySession error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment. Please contact support.',
    });
  }
};
