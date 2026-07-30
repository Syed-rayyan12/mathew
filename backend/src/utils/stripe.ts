import Stripe from 'stripe';
import { config } from '../config';
import {
  GROUP_BANDS,
  flatAmountPence,
  priceLookupKey,
  toStripeTiers,
  type BillingPeriod,
  type PlanTier,
  type StripeTier,
} from './pricing';

export type PlanKey = 'standard' | 'platinum';

const PLAN_DETAILS: Record<PlanKey, { name: string; description: string }> = {
  standard: {
    name: 'Single Standard Nursery Listing',
    description: 'Standard listing for a single nursery.',
  },
  platinum: {
    name: 'Platinum Nursery Listing',
    description: 'Platinum listing for a single nursery or a group.',
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

/**
 * The Stripe catalogue does not say what pricing.ts says.
 *
 * Thrown rather than repaired: a Price cannot be edited once created, so the
 * only honest repair is a version bump, which is a human decision. Blocking
 * checkout is the safe failure — charging the wrong amount is not.
 */
export class PriceCatalogueError extends Error {}

export type PlanPriceIds = Record<PlanTier, Record<BillingPeriod, string>>;

const TIERS: ReadonlyArray<PlanTier> = ['standard', 'platinum'];
const PERIODS: ReadonlyArray<BillingPeriod> = ['monthly', 'annual'];

const sameTiers = (a: StripeTier[], b: StripeTier[]): boolean =>
  a.length === b.length &&
  a.every((tier, i) => tier.up_to === b[i].up_to && tier.unit_amount === b[i].unit_amount);

/** Stripe returns tiers only when asked, and `up_to: null` means unbounded. */
function readTiers(price: Stripe.Price): StripeTier[] {
  return (price.tiers ?? []).map((tier) => ({
    up_to: tier.up_to === null ? ('inf' as const) : tier.up_to,
    unit_amount: tier.unit_amount ?? -1,
  }));
}

function verify(price: Stripe.Price, tier: PlanTier, billing: BillingPeriod): void {
  const key = priceLookupKey(tier, billing);
  const interval = billing === 'annual' ? 'year' : 'month';

  if (price.currency !== 'gbp') {
    throw new PriceCatalogueError(`Stripe price ${key} is in ${price.currency}, expected gbp.`);
  }
  if (price.recurring?.interval !== interval) {
    throw new PriceCatalogueError(
      `Stripe price ${key} renews every ${price.recurring?.interval ?? 'never'}, expected ${interval}.`
    );
  }

  if (tier === 'platinum') {
    const expected = toStripeTiers(GROUP_BANDS, billing);
    if (price.billing_scheme !== 'tiered' || price.tiers_mode !== 'volume') {
      throw new PriceCatalogueError(`Stripe price ${key} is not a volume-tiered price.`);
    }
    if (!sameTiers(readTiers(price), expected)) {
      throw new PriceCatalogueError(
        `Stripe price ${key} does not match the band table in pricing.ts. ` +
          'Bump PRICE_VERSION rather than editing the price.'
      );
    }
    return;
  }

  const expected = flatAmountPence(tier, billing);
  if (price.unit_amount !== expected) {
    throw new PriceCatalogueError(
      `Stripe price ${key} charges ${price.unit_amount}, pricing.ts says ${expected}. ` +
        'Bump PRICE_VERSION rather than editing the price.'
    );
  }
}

async function findByLookupKey(key: string): Promise<Stripe.Price | null> {
  const page = await getStripe().prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
    expand: ['data.tiers'],
  });
  return page.data[0] ?? null;
}

async function createPrice(
  productId: string,
  tier: PlanTier,
  billing: BillingPeriod
): Promise<Stripe.Price> {
  const shape: Stripe.PriceCreateParams =
    tier === 'platinum'
      ? {
          currency: 'gbp',
          product: productId,
          lookup_key: priceLookupKey(tier, billing),
          recurring: { interval: billing === 'annual' ? 'year' : 'month' },
          billing_scheme: 'tiered',
          tiers_mode: 'volume',
          tiers: toStripeTiers(GROUP_BANDS, billing),
        }
      : {
          currency: 'gbp',
          product: productId,
          lookup_key: priceLookupKey(tier, billing),
          recurring: { interval: billing === 'annual' ? 'year' : 'month' },
          unit_amount: flatAmountPence(tier, billing),
        };

  return getStripe().prices.create(shape);
}

/**
 * The four Prices a subscription can be sold against, keyed by tier and period.
 *
 * Runs on first checkout rather than at boot: a Stripe blip should not take the
 * public site down to protect a path nobody is mid-way through. A mismatch
 * blocks checkout and leaves the site up.
 */
export async function ensurePlanPrices(): Promise<PlanPriceIds> {
  const products = await ensurePlanProducts();
  const ids = {} as PlanPriceIds;

  for (const tier of TIERS) {
    ids[tier] = {} as Record<BillingPeriod, string>;
    for (const billing of PERIODS) {
      const key = priceLookupKey(tier, billing);
      const found = await findByLookupKey(key);
      if (found) {
        verify(found, tier, billing);
        ids[tier][billing] = found.id;
        continue;
      }
      const created = await createPrice(products[tier], tier, billing);
      ids[tier][billing] = created.id;
    }
  }

  return ids;
}
