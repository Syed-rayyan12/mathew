import Stripe from 'stripe';
import { config } from '../config';

export type PlanKey = 'standard' | 'platinum';

const PLAN_DETAILS: Record<PlanKey, { name: string; description: string }> = {
  standard: {
    name: 'Standard Nursery Listing',
    description: 'Standard listing plan for nursery owners.',
  },
  platinum: {
    name: 'Platinum Nursery Listing',
    description: 'Platinum listing plan for nursery owners.',
  },
};

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, { timeout: 10000 });
  }

  return stripeClient;
}

export async function ensurePlanProducts(): Promise<Record<PlanKey, string>> {
  const stripe = getStripe();
  const existing = await stripe.products.list({ active: true, limit: 100 });
  const productIds = {} as Record<PlanKey, string>;

  for (const plan of Object.keys(PLAN_DETAILS) as PlanKey[]) {
    const product = existing.data.find((item) => item.metadata.mathew_plan === plan)
      || await stripe.products.create({
        ...PLAN_DETAILS[plan],
        metadata: { mathew_plan: plan },
      });
    productIds[plan] = product.id;
  }

  return productIds;
}
