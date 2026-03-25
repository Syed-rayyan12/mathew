import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { config } from '../config';
import { hashPassword, ConflictError } from '../utils';
import { generateShortId } from '../utils/id-generator';
const stripe = new Stripe(config.stripe.secretKey);

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
    const { email, password, firstName, lastName, phone, nurseryName, city, town } = req.body;

    // Validate required fields before creating checkout
    if (!email || !password || !firstName || !lastName || !phone || !nurseryName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash the password now so we can store the hash in metadata
    const hashedPassword = await hashPassword(password);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product: config.stripe.productId || 'prod_UDIfG1ovyR9FV7',
            unit_amount: 14995, // £149.95 in pence
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
      },
      success_url: `${config.frontendUrl}/payment-success`,
      cancel_url: `${config.frontendUrl}/payment-cancelled`,
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('❌ createCheckoutSession error:', error);
    next(error);
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
    event = stripe.webhooks.constructEvent(
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
    if (session.payment_status !== 'paid') {
      console.log('Payment not completed, skipping account creation');
      return res.json({ received: true });
    }

    const meta = session.metadata;
    if (!meta || !meta.email) {
      console.error('No metadata found on checkout session');
      return res.json({ received: true });
    }

    try {
      // Check if user was already created (idempotency)
      const existingUser = await prisma.user.findUnique({
        where: { email: meta.email },
      });

      if (existingUser) {
        console.log(`User ${meta.email} already exists, skipping creation`);
        return res.json({ received: true });
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
    } catch (err) {
      console.error('❌ Error creating nursery account from webhook:', err);
      // Return 200 anyway so Stripe doesn't retry endlessly
    }
  }

  res.json({ received: true });
};
