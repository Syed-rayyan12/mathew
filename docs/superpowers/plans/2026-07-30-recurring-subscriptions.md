# Recurring Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn nursery plan checkout from `mode: 'payment'` one-time charges into real Stripe subscriptions, so the "monthly recurring, 90 days notice" promise on the Checkout button becomes true and a lapsed account's listings come off the public site.

**Architecture:** Four versioned Price objects in the Stripe catalogue (Standard flat, Platinum volume-tiered) replace inline `price_data`, so a subscription can be updated in place. Plan state stops coming from client-influenced Checkout metadata and is instead reconciled from the subscription itself — the item's Price says which tier, its quantity says how many nurseries. Four new `User` columns cache the Stripe subscription status; webhooks refresh them; one shared Prisma `where` fragment hides listings whose owner is not live.

**Tech Stack:** TypeScript, Express, Prisma 5.22 (PostgreSQL), `stripe` npm 20.4.1 (pinned API version `2026-02-25.clover`), Vitest 2.1, Next.js App Router frontend.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-30-subscription-billing-design.md`. Read it before starting.
- **No local database.** Prisma migrations are hand-written SQL files; `prisma migrate dev` must never be run. `npx prisma generate` is safe and is what makes new columns visible to TypeScript.
- **Tests cover pure functions and file contents only.** There is no DB or Stripe test harness. Controller changes are verified by `npx tsc --noEmit` plus the manual Stripe test-mode smoke test in Task 15.
- **Money is in pence, integers only.** Never introduce a float into a price path.
- **Stripe API version is `2026-02-25.clover`.** In this version `current_period_end` lives on the *subscription item* (`sub.items.data[0].current_period_end`), NOT on the subscription. Do not write `sub.current_period_end` — it does not exist and will not type-check.
- **Price lookup keys:** `mathew_{tier}_{billing}_v{PRICE_VERSION}` — e.g. `mathew_platinum_annual_v1`.
- **Platinum volume ladder (monthly, pence):** `up_to 1 → 3860`, `up_to 5 → 3474`, `up_to 15 → 3088`, `up_to 30 → 2702`, `up_to 60 → 2316`, `up_to 'inf' → 2316`. Annual is each × 12.
- **Standard flat (pence):** monthly `2395`, annual `28740`. Always bought at quantity 1.
- **Live statuses:** `active`, `trialing`, `past_due`. Everything else is not live. `past_due` counts as live on purpose — Stripe retries for ~3 weeks and an expired card must not pull a nursery off the site before anyone can fix it.
- **ADMIN always passes.** Admin-owned nurseries stay publicly visible and admins bypass `requireFeature`, exactly as today.
- **Backend commands** run from `backend/`: `npx tsc --noEmit`, `npm test`, `npx prisma generate`.
- **Frontend commands** run from `frontend/`: `npx tsc --noEmit`, `npm run build`.
- **Do not push.** Commit locally only. The migration is applied to Railway by the user, not by this plan.

## Deviation from the spec

The spec's data model lists **four** columns. This plan adds a **fifth**, `cancelAt DateTime?`.

Reason: the spec also says "The admin table gains … any scheduled cancellation date". Without a local column the admin list would need one `subscriptions.retrieve` per row. `cancelAt` is refreshed by the same webhook as the other four and is a cache in exactly the same sense.

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `backend/src/utils/subscription-sync.ts` | Pure translation of a `Stripe.Subscription` into the columns, plus the one DB writer that applies it. Nothing else reads Stripe subscription shapes. |
| `backend/src/utils/subscription-sync.test.ts` | Tests for the pure translation. |
| `backend/src/utils/public-visibility.ts` | `PUBLIC_NURSERY_WHERE` — the single filter every public nursery query uses. |
| `backend/src/utils/public-visibility.test.ts` | File-reading test asserting no public query hand-rolls its own filter. |
| `backend/src/utils/price-catalogue.test.ts` | Tests for the tier ladder and the version-bump guard. |
| `backend/prisma/migrations/20260731000000_add_subscription_columns/migration.sql` | The five columns. |

**Modified files**

| File | Change |
|---|---|
| `backend/src/utils/pricing.ts` | Adds `PRICE_VERSION`, `priceLookupKey()`, `toStripeTiers()`. Band table unchanged. |
| `backend/src/utils/stripe.ts` | Adds `ensurePlanPrices()` and `PriceCatalogueError`. |
| `backend/src/utils/entitlements.ts` | Adds `LIVE_SUBSCRIPTION_STATUSES`, `isLive()`; `canAddNursery()` gains the billing check. |
| `backend/src/utils/entitlements.test.ts` | Tests for the above. |
| `backend/prisma/schema.prisma` | Five columns on `User`. |
| `backend/src/controllers/stripe.controller.ts` | `mode: 'subscription'`, reconciler-driven webhook, `previewChange` / `applyChange`. |
| `backend/src/routes/stripe.routes.ts` | New endpoints, retired ones. |
| `backend/src/controllers/user.nursery.controller.ts` | Six public queries adopt `PUBLIC_NURSERY_WHERE`. |
| `backend/src/controllers/nursery-dashboard.controller.ts` | `createNursery` lock reads status; entitlements endpoint reports it. |
| `backend/src/middleware/entitlement.ts` | `requireFeature` refuses when not live. |
| `backend/src/controllers/admin.controller.ts` | Subscription columns + two cancel actions. |
| `backend/src/routes/admin.routes.ts` | Cancel routes. |
| `backend/src/controllers/payment-history.controller.ts` | `invoices.list` instead of `checkout.sessions.list`. |
| `frontend/lib/api/auth.ts`, `frontend/lib/api/admin.ts`, `frontend/lib/api/nursery.ts` | Matching client methods and types. |
| `frontend/app/nursery-dashboard/upgrade/page.tsx` | Becomes a preview-then-confirm screen. |
| `frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx` | New columns, cancel buttons, invoice fields. |

## Task order and why

Tasks 1–2 build the catalogue, 3–5 build the state model, 6–8 rewire the money flows, 9–10 make the entitlement actually bite, 11–13 catch up admin and the frontend, 14–15 land it safely. Nothing before Task 6 changes customer-visible behaviour, so 1–5 are safe to commit and sit on.

---

### Task 1: Price catalogue shape in `pricing.ts`

Stripe Prices are immutable, so the band table needs a version and a way to express itself as a Stripe tier ladder. Both are pure functions — no Stripe calls in this task.

**Files:**
- Modify: `backend/src/utils/pricing.ts` (append after `findGroupBand`, around line 55)
- Test: `backend/src/utils/price-catalogue.test.ts` (create)

**Interfaces:**
- Consumes: `GROUP_BANDS`, `SINGLE_PLATINUM_MONTHLY_PENCE`, `SINGLE_STANDARD_MONTHLY_PENCE`, `PlanTier`, `BillingPeriod` — all already exported from `pricing.ts`.
- Produces:
  - `PRICE_VERSION: number`
  - `interface StripeTier { up_to: number | 'inf'; unit_amount: number }`
  - `toStripeTiers(bands: readonly GroupBand[], billing: BillingPeriod): StripeTier[]`
  - `flatAmountPence(tier: PlanTier, billing: BillingPeriod): number`
  - `priceLookupKey(tier: PlanTier, billing: BillingPeriod): string`
  - `parseLookupKey(key: string | null | undefined): { tier: PlanTier; billing: BillingPeriod } | null`

- [ ] **Step 1: Write the failing test**

Create `backend/src/utils/price-catalogue.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  GROUP_BANDS,
  PRICE_VERSION,
  SINGLE_STANDARD_MONTHLY_PENCE,
  flatAmountPence,
  parseLookupKey,
  priceLookupKey,
  toStripeTiers,
  type StripeTier,
} from './pricing';

/**
 * Every ladder that has ever been published, keyed by the version it was
 * published under. Stripe Prices cannot be edited, so changing a band means
 * minting a new Price, which means bumping PRICE_VERSION and adding an entry
 * here. The old entries stay as history — subscribers are still on them.
 */
const PUBLISHED: Record<number, { standardMonthly: number; platinumMonthly: StripeTier[] }> = {
  1: {
    standardMonthly: 2395,
    platinumMonthly: [
      { up_to: 1, unit_amount: 3860 },
      { up_to: 5, unit_amount: 3474 },
      { up_to: 15, unit_amount: 3088 },
      { up_to: 30, unit_amount: 2702 },
      { up_to: 60, unit_amount: 2316 },
      { up_to: 'inf', unit_amount: 2316 },
    ],
  },
};

describe('toStripeTiers', () => {
  it('produces the volume ladder for the monthly platinum price', () => {
    expect(toStripeTiers(GROUP_BANDS, 'monthly')).toEqual([
      { up_to: 1, unit_amount: 3860 },
      { up_to: 5, unit_amount: 3474 },
      { up_to: 15, unit_amount: 3088 },
      { up_to: 30, unit_amount: 2702 },
      { up_to: 60, unit_amount: 2316 },
      { up_to: 'inf', unit_amount: 2316 },
    ]);
  });

  it('multiplies every tier by twelve for the annual price', () => {
    expect(toStripeTiers(GROUP_BANDS, 'annual')).toEqual([
      { up_to: 1, unit_amount: 46320 },
      { up_to: 5, unit_amount: 41688 },
      { up_to: 15, unit_amount: 37056 },
      { up_to: 30, unit_amount: 32424 },
      { up_to: 60, unit_amount: 27792 },
      { up_to: 'inf', unit_amount: 27792 },
    ]);
  });

  it('ends unbounded, because Stripe requires a fallback tier', () => {
    const tiers = toStripeTiers(GROUP_BANDS, 'monthly');
    expect(tiers[tiers.length - 1].up_to).toBe('inf');
  });

  it('repeats the top rate in the fallback tier so 61+ is never cheaper', () => {
    const tiers = toStripeTiers(GROUP_BANDS, 'monthly');
    expect(tiers[tiers.length - 1].unit_amount).toBe(tiers[tiers.length - 2].unit_amount);
  });
});

describe('PRICE_VERSION', () => {
  it('has a published ladder recorded for the current version', () => {
    expect(
      PUBLISHED[PRICE_VERSION],
      `No published ladder for v${PRICE_VERSION}. Add one to PUBLISHED.`
    ).toBeDefined();
  });

  it('matches the ladder published under that version', () => {
    const published = PUBLISHED[PRICE_VERSION];
    expect(
      toStripeTiers(GROUP_BANDS, 'monthly'),
      'A band changed without bumping PRICE_VERSION. Existing subscribers are ' +
        'on the old Price, so bump the version and add a new PUBLISHED entry.'
    ).toEqual(published.platinumMonthly);
    expect(SINGLE_STANDARD_MONTHLY_PENCE).toBe(published.standardMonthly);
  });
});

describe('flatAmountPence', () => {
  it('prices standard monthly and annual', () => {
    expect(flatAmountPence('standard', 'monthly')).toBe(2395);
    expect(flatAmountPence('standard', 'annual')).toBe(28740);
  });

  it('prices a single platinum at the top of the ladder', () => {
    expect(flatAmountPence('platinum', 'monthly')).toBe(3860);
    expect(flatAmountPence('platinum', 'annual')).toBe(46320);
  });
});

describe('priceLookupKey / parseLookupKey', () => {
  it('builds the four documented keys', () => {
    expect(priceLookupKey('standard', 'monthly')).toBe('mathew_standard_monthly_v1');
    expect(priceLookupKey('standard', 'annual')).toBe('mathew_standard_annual_v1');
    expect(priceLookupKey('platinum', 'monthly')).toBe('mathew_platinum_monthly_v1');
    expect(priceLookupKey('platinum', 'annual')).toBe('mathew_platinum_annual_v1');
  });

  it('round-trips', () => {
    expect(parseLookupKey(priceLookupKey('platinum', 'annual'))).toEqual({
      tier: 'platinum',
      billing: 'annual',
    });
  });

  it('reads a grandfathered key from an older version', () => {
    expect(parseLookupKey('mathew_platinum_monthly_v7')).toEqual({
      tier: 'platinum',
      billing: 'monthly',
    });
  });

  it('returns null rather than guessing at anything unrecognised', () => {
    expect(parseLookupKey(null)).toBeNull();
    expect(parseLookupKey(undefined)).toBeNull();
    expect(parseLookupKey('')).toBeNull();
    expect(parseLookupKey('price_1234')).toBeNull();
    expect(parseLookupKey('mathew_gold_monthly_v1')).toBeNull();
    expect(parseLookupKey('mathew_platinum_weekly_v1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`:

```bash
npx vitest run src/utils/price-catalogue.test.ts
```

Expected: FAIL. Errors are import failures — `PRICE_VERSION`, `toStripeTiers`, `flatAmountPence`, `priceLookupKey`, `parseLookupKey`, `StripeTier` are not exported from `./pricing`.

- [ ] **Step 3: Implement in `pricing.ts`**

Insert immediately after the `findGroupBand` function (currently ends line 55) in `backend/src/utils/pricing.ts`:

```ts
/**
 * Bumped by hand whenever any amount above changes.
 *
 * Stripe Prices are immutable — a unit_amount or tier ladder cannot be edited
 * after creation — so a price change is a new Price, and a new Price needs a
 * new lookup key. Keeping the version explicit rather than hashing the table
 * keeps the keys readable and stops cosmetic edits from churning the
 * catalogue. `price-catalogue.test.ts` fails if the table moves and this
 * does not.
 *
 * Existing subscribers stay on the Price they bought until deliberately
 * migrated, so grandfathering is the default rather than something to
 * remember.
 */
export const PRICE_VERSION = 1;

/** A Stripe volume tier. `up_to` is inclusive; the last tier must be 'inf'. */
export interface StripeTier {
  up_to: number | 'inf';
  unit_amount: number;
}

const perPeriod = (monthlyPence: number, billing: BillingPeriod): number =>
  billing === 'annual' ? monthlyPence * 12 : monthlyPence;

/**
 * The band table as a Stripe volume ladder.
 *
 * Tier one is the single Platinum rate, because a group of one is a Single —
 * quantity 1 on this ladder and the standalone Single Platinum price are the
 * same product at the same money. The trailing 'inf' tier exists only because
 * Stripe requires the last tier to be unbounded; it repeats the top rate so a
 * group of 61 can never come out cheaper than a group of 60. Anything at or
 * above BESPOKE_THRESHOLD is refused by `quote()` long before it reaches
 * Stripe, and that refusal is the only thing preventing a self-serve group
 * of 200.
 */
export function toStripeTiers(
  bands: readonly GroupBand[],
  billing: BillingPeriod
): StripeTier[] {
  const ladder: StripeTier[] = [
    { up_to: 1, unit_amount: perPeriod(SINGLE_PLATINUM_MONTHLY_PENCE, billing) },
    ...bands.map((band) => ({
      up_to: band.max,
      unit_amount: perPeriod(band.unitPence, billing),
    })),
  ];
  const top = ladder[ladder.length - 1];
  return [...ladder, { up_to: 'inf', unit_amount: top.unit_amount }];
}

/**
 * The flat amount for a non-tiered Price. Standard is flat because a Standard
 * account covers one nursery by definition — there is no ladder to express.
 * Platinum's flat amount is only used for verification against tier one.
 */
export function flatAmountPence(tier: PlanTier, billing: BillingPeriod): number {
  const monthly =
    tier === 'platinum' ? SINGLE_PLATINUM_MONTHLY_PENCE : SINGLE_STANDARD_MONTHLY_PENCE;
  return perPeriod(monthly, billing);
}

export function priceLookupKey(tier: PlanTier, billing: BillingPeriod): string {
  return `mathew_${tier}_${billing}_v${PRICE_VERSION}`;
}

const LOOKUP_KEY_RE = /^mathew_(standard|platinum)_(monthly|annual)_v(\d+)$/;

/**
 * Reads a lookup key back into a tier and a billing period, at any version.
 *
 * This is how a subscription says which plan it is: the Price on the item
 * carries the key, so nothing has to trust metadata. Returns null rather than
 * defaulting, because a key we do not recognise means a Price nobody here
 * created, and silently calling that "standard" would downgrade a paying
 * customer.
 */
export function parseLookupKey(
  key: string | null | undefined
): { tier: PlanTier; billing: BillingPeriod } | null {
  const match = LOOKUP_KEY_RE.exec(key ?? '');
  if (!match) return null;
  return { tier: match[1] as PlanTier, billing: match[2] as BillingPeriod };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `backend/`:

```bash
npx vitest run src/utils/price-catalogue.test.ts && npx vitest run && npx tsc --noEmit
```

Expected: `price-catalogue.test.ts` PASS with 12 tests; the full run PASS with no regressions in `pricing.test.ts`, `pricing-parity.test.ts` or `entitlements.test.ts`; `tsc` silent.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/pricing.ts backend/src/utils/price-catalogue.test.ts
git commit -m "feat(pricing): express the band table as a versioned Stripe tier ladder"
```

---

### Task 2: `ensurePlanPrices()` — reconcile the Stripe catalogue

Four real Price objects, looked up by key and verified against `pricing.ts`. Created only when absent; never edited, because Stripe will not allow it.

**Files:**
- Modify: `backend/src/utils/stripe.ts`

**Interfaces:**
- Consumes: `priceLookupKey`, `toStripeTiers`, `flatAmountPence`, `GROUP_BANDS`, `PlanTier`, `BillingPeriod` from Task 1; `ensurePlanProducts()`, `getStripe()` already in this file.
- Produces:
  - `class PriceCatalogueError extends Error`
  - `type PlanPriceIds = Record<PlanTier, Record<BillingPeriod, string>>`
  - `ensurePlanPrices(): Promise<PlanPriceIds>`

- [ ] **Step 1: Replace the contents of `backend/src/utils/stripe.ts`**

There is no unit test for this step — it is entirely Stripe I/O, and the repo has no Stripe test harness. It is verified by `tsc` here and by the test-mode smoke test in Task 15.

```ts
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
```

- [ ] **Step 2: Verify it type-checks**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

Expected: both silent/PASS. `tsc` proves `Stripe.PriceCreateParams` accepts the tiered shape and that `price.tiers` exists on the pinned API version.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/stripe.ts
git commit -m "feat(stripe): reconcile four catalogue Prices against pricing.ts"
```

---

### Task 3: Subscription columns on `User`

A local cache of Stripe's answer to "is this currently paid for". Stripe stays the source of truth; the webhook refreshes these.

**Files:**
- Modify: `backend/prisma/schema.prisma` (the `User` model, currently lines 9–37)
- Create: `backend/prisma/migrations/20260731000000_add_subscription_columns/migration.sql`

**Interfaces:**
- Produces: `User.stripeCustomerId`, `User.stripeSubscriptionId`, `User.subscriptionStatus`, `User.currentPeriodEnd`, `User.cancelAt` — every later task reads or writes these.

- [ ] **Step 1: Add the columns to the Prisma schema**

In `backend/prisma/schema.prisma`, replace this pair of lines inside `model User`:

```prisma
  planTier         String  @default("standard") // "standard" | "platinum"
  paidNurseryCount Int     @default(1)          // nurseries this account paid for
```

with:

```prisma
  planTier         String  @default("standard") // "standard" | "platinum"
  paidNurseryCount Int     @default(1)          // nurseries this account paid for

  /// Mirror of the Stripe subscription. Stripe is the source of truth; these
  /// are a cache the webhook refreshes so that public queries and the admin
  /// list do not need a Stripe round trip per row.
  ///
  /// Three columns, three questions, matching the split already in
  /// entitlements.ts: planTier says what the plan includes, paidNurseryCount
  /// says how many nurseries it covers, subscriptionStatus says whether it is
  /// currently paid for.
  stripeCustomerId     String?
  stripeSubscriptionId String?   @unique
  /// Stripe's own status string, or "none" for an account that has never
  /// subscribed. Live means active, trialing or past_due — see isLive().
  subscriptionStatus   String    @default("none")
  currentPeriodEnd     DateTime?
  /// Set when an admin schedules a cancellation. Billing continues until then.
  cancelAt             DateTime?
```

- [ ] **Step 2: Write the migration**

Create `backend/prisma/migrations/20260731000000_add_subscription_columns/migration.sql`:

```sql
-- Subscription state mirrored from Stripe.
--
-- Every existing owner defaults to 'none'. That is deliberate: nothing on this
-- database has ever had a recurring subscription, because checkout ran in
-- mode:'payment' until now. Backfill before deploying — see Task 14.
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "users" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "cancelAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- Public nursery queries filter on the owner's status, so this is on the hot
-- path for every visitor-facing list.
CREATE INDEX "users_subscriptionStatus_idx" ON "users"("subscriptionStatus");
```

- [ ] **Step 3: Regenerate the Prisma client and verify**

Run from `backend/`:

```bash
npx prisma generate && npx tsc --noEmit && npm test
```

Expected: `generate` reports "Generated Prisma Client"; `tsc` silent; tests PASS. Do **not** run `prisma migrate dev` — there is no local database and the migration is applied to Railway by hand.

- [ ] **Step 4: Confirm the new fields are visible to TypeScript**

Run from `backend/`:

```bash
grep -c "subscriptionStatus" node_modules/.prisma/client/index.d.ts
```

Expected: a number greater than zero. If it is zero, `prisma generate` did not pick up the schema edit — re-run it before continuing, because every later task depends on these fields type-checking.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260731000000_add_subscription_columns
git commit -m "feat(db): mirror Stripe subscription state on User"
```

---

### Task 4: `isLive()` and the allowance gate

The third question — "is it currently paid for?" — gets its own function, and `canAddNursery` starts asking it.

`features()` and `allowance()` stay exactly as they are. Folding billing status into `features()` would leave admin unable to tell a lapsed Group of 8 from a Single Standard, which is the first thing worth knowing when the owner calls.

**Files:**
- Modify: `backend/src/utils/entitlements.ts`
- Modify: `backend/src/utils/entitlements.test.ts`
- Modify: `backend/src/controllers/nursery-dashboard.controller.ts:160-173` (the `createNursery` row lock — the only `canAddNursery` call site)

**Interfaces:**
- Consumes: `PlanAccount`, `allowance()` — already in `entitlements.ts`.
- Produces:
  - `LIVE_SUBSCRIPTION_STATUSES: readonly ['active', 'trialing', 'past_due']`
  - `interface BillingAccount { subscriptionStatus: string | null }`
  - `isLive(account: BillingAccount): boolean`
  - `canAddNursery(account: PlanAccount & BillingAccount, usedCount: number): boolean` — **signature widened**, callers must now select `subscriptionStatus`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/utils/entitlements.test.ts`:

```ts
describe('isLive', () => {
  it('is true for the three statuses that keep a listing up', () => {
    expect(isLive({ subscriptionStatus: 'active' })).toBe(true);
    expect(isLive({ subscriptionStatus: 'trialing' })).toBe(true);
    expect(isLive({ subscriptionStatus: 'past_due' })).toBe(true);
  });

  it('is false for every status Stripe uses that does not', () => {
    for (const status of [
      'incomplete',
      'incomplete_expired',
      'canceled',
      'unpaid',
      'paused',
    ]) {
      expect(isLive({ subscriptionStatus: status }), status).toBe(false);
    }
  });

  it('is false for an account that has never subscribed', () => {
    expect(isLive({ subscriptionStatus: 'none' })).toBe(false);
    expect(isLive({ subscriptionStatus: null })).toBe(false);
    expect(isLive({ subscriptionStatus: '' })).toBe(false);
  });

  it('is false for anything unrecognised, rather than assuming paid', () => {
    expect(isLive({ subscriptionStatus: 'ACTIVE' })).toBe(false);
    expect(isLive({ subscriptionStatus: 'live' })).toBe(false);
    expect(isLive({ subscriptionStatus: 'active ' })).toBe(false);
  });
});

describe('canAddNursery composition', () => {
  const group = { planTier: 'platinum', paidNurseryCount: 8 };

  it('allows a nursery when there is headroom and the plan is paid for', () => {
    expect(canAddNursery({ ...group, subscriptionStatus: 'active' }, 3)).toBe(true);
  });

  it('refuses when the plan is not paid for, even with headroom', () => {
    expect(canAddNursery({ ...group, subscriptionStatus: 'canceled' }, 3)).toBe(false);
    expect(canAddNursery({ ...group, subscriptionStatus: 'none' }, 0)).toBe(false);
  });

  it('refuses when there is no headroom, even while paid for', () => {
    expect(canAddNursery({ ...group, subscriptionStatus: 'active' }, 8)).toBe(false);
  });

  it('still allows during the past_due retry window', () => {
    expect(canAddNursery({ ...group, subscriptionStatus: 'past_due' }, 3)).toBe(true);
  });
});
```

Add `isLive` to the existing import at the top of that file:

```ts
import {
  allowance,
  canAddNursery,
  features,
  isGroup,
  isLive,
  normaliseTier,
  paidCount,
  planFromMetadata,
  planLabel,
} from './entitlements';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `backend/`:

```bash
npx vitest run src/utils/entitlements.test.ts
```

Expected: FAIL — `isLive` is not exported from `./entitlements`.

- [ ] **Step 3: Implement in `entitlements.ts`**

Add after the `Allowance` interface (currently ends line 40) in `backend/src/utils/entitlements.ts`:

```ts
/**
 * The statuses that keep a listing on the site.
 *
 * past_due is here on purpose. Stripe's card retries run for roughly three
 * weeks, and an expired card should not pull a nursery off the site before
 * anyone has had a chance to fix it. The dashboard warns during that window.
 */
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const;

export interface BillingAccount {
  subscriptionStatus: string | null;
}

/** Is this account currently paid for? Unknown is never treated as paid. */
export function isLive(account: BillingAccount): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    account.subscriptionStatus ?? ''
  );
}
```

Then replace `canAddNursery` (currently lines 83–85) with:

```ts
/**
 * Both questions at once: is there headroom, and is the plan paid for.
 *
 * The AND lives here rather than inside allowance() so that admin can still
 * see that a lapsed account bought eight nurseries.
 */
export function canAddNursery(
  account: PlanAccount & BillingAccount,
  usedCount: number
): boolean {
  return isLive(account) && allowance(account, usedCount).remaining > 0;
}
```

- [ ] **Step 4: Fix the one call site**

In `backend/src/controllers/nursery-dashboard.controller.ts`, the `createNursery` row lock currently reads two columns. Replace:

```ts
        const locked: Array<{ planTier: string; paidNurseryCount: number }> =
          await tx.$queryRaw`SELECT "planTier", "paidNurseryCount" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
```

with:

```ts
        const locked: Array<{
          planTier: string;
          paidNurseryCount: number;
          subscriptionStatus: string;
        }> = await tx.$queryRaw`SELECT "planTier", "paidNurseryCount", "subscriptionStatus" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run from `backend/`:

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all suites PASS including the 12 new assertions; `tsc` silent. If `tsc` reports a `canAddNursery` argument error anywhere other than the site fixed in Step 4, that call site also needs `subscriptionStatus` selected — fix it the same way.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/entitlements.ts backend/src/utils/entitlements.test.ts backend/src/controllers/nursery-dashboard.controller.ts
git commit -m "feat(entitlements): a nursery needs headroom and a live subscription"
```

---

### Task 5: `reconcileFromSubscription()` — the single source of plan truth

Today `planTier` and `paidNurseryCount` are read out of Stripe session metadata: a value the client influenced, round-tripped through a third party. A subscription *is* the plan — the item's Price says which tier, its quantity says how many nurseries — so this replaces metadata for everything financial.

Replay stops mattering, because re-running the reconciler re-reads current truth and writes the same values.

**Files:**
- Create: `backend/src/utils/subscription-sync.ts`
- Create: `backend/src/utils/subscription-sync.test.ts`

**Interfaces:**
- Consumes: `parseLookupKey`, `PlanTier` (Task 1); `prisma` from `../config/database`; `getStripe` from `./stripe`.
- Produces:
  - `interface SubscriptionSnapshot { planTier: PlanTier; paidNurseryCount: number; subscriptionStatus: string; currentPeriodEnd: Date | null; cancelAt: Date | null; stripeCustomerId: string | null; stripeSubscriptionId: string }`
  - `class SubscriptionShapeError extends Error`
  - `readSubscription(sub: Stripe.Subscription): SubscriptionSnapshot` — pure
  - `reconcileFromSubscription(subscriptionId: string, userId: string): Promise<SubscriptionSnapshot>` — re-fetches from Stripe, writes the columns
  - `clearSubscription(userId: string, status: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `backend/src/utils/subscription-sync.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SubscriptionShapeError, readSubscription } from './subscription-sync';

/**
 * The shape readSubscription actually reads, not a full Stripe object. Cast at
 * the call site keeps the fixtures readable; anything this helper omits is
 * something the function must not depend on.
 */
const subscription = (over: {
  lookupKey?: string | null;
  quantity?: number;
  status?: string;
  periodEnd?: number;
  cancelAt?: number | null;
  customer?: string;
  id?: string;
  items?: unknown[];
}) =>
  ({
    id: over.id ?? 'sub_123',
    status: over.status ?? 'active',
    customer: over.customer ?? 'cus_123',
    cancel_at: over.cancelAt ?? null,
    items: {
      data: over.items ?? [
        {
          quantity: over.quantity ?? 1,
          current_period_end: over.periodEnd ?? 1_800_000_000,
          price: { lookup_key: over.lookupKey === undefined ? 'mathew_platinum_monthly_v1' : over.lookupKey },
        },
      ],
    },
  }) as any;

describe('readSubscription', () => {
  it('takes the tier from the price lookup key', () => {
    expect(readSubscription(subscription({ lookupKey: 'mathew_standard_annual_v1' })).planTier)
      .toBe('standard');
    expect(readSubscription(subscription({ lookupKey: 'mathew_platinum_monthly_v1' })).planTier)
      .toBe('platinum');
  });

  it('reads a grandfathered price from an older version', () => {
    expect(readSubscription(subscription({ lookupKey: 'mathew_platinum_annual_v3' })).planTier)
      .toBe('platinum');
  });

  it('takes the nursery count from the item quantity', () => {
    expect(readSubscription(subscription({ quantity: 8 })).paidNurseryCount).toBe(8);
  });

  it('treats a missing quantity as one, which is what Stripe means by it', () => {
    expect(readSubscription(subscription({ quantity: undefined })).paidNurseryCount).toBe(1);
  });

  it('copies the status through verbatim', () => {
    expect(readSubscription(subscription({ status: 'past_due' })).subscriptionStatus)
      .toBe('past_due');
    expect(readSubscription(subscription({ status: 'canceled' })).subscriptionStatus)
      .toBe('canceled');
  });

  it('reads the period end off the item, where this API version keeps it', () => {
    expect(readSubscription(subscription({ periodEnd: 1_800_000_000 })).currentPeriodEnd)
      .toEqual(new Date(1_800_000_000_000));
  });

  it('reads a scheduled cancellation, and null when there is none', () => {
    expect(readSubscription(subscription({ cancelAt: 1_900_000_000 })).cancelAt)
      .toEqual(new Date(1_900_000_000_000));
    expect(readSubscription(subscription({ cancelAt: null })).cancelAt).toBeNull();
  });

  it('keeps the customer and subscription ids', () => {
    const snap = readSubscription(subscription({ id: 'sub_abc', customer: 'cus_xyz' }));
    expect(snap.stripeSubscriptionId).toBe('sub_abc');
    expect(snap.stripeCustomerId).toBe('cus_xyz');
  });

  it('reads an expanded customer object as well as an id', () => {
    const snap = readSubscription(subscription({ customer: { id: 'cus_exp' } as any }));
    expect(snap.stripeCustomerId).toBe('cus_exp');
  });

  it('refuses a price it does not recognise rather than guessing a tier', () => {
    expect(() => readSubscription(subscription({ lookupKey: null })))
      .toThrow(SubscriptionShapeError);
    expect(() => readSubscription(subscription({ lookupKey: 'price_handmade' })))
      .toThrow(SubscriptionShapeError);
  });

  it('refuses a subscription with no items', () => {
    expect(() => readSubscription(subscription({ items: [] })))
      .toThrow(SubscriptionShapeError);
  });

  it('refuses a subscription with more than one item, which we never sell', () => {
    const two = subscription({});
    two.items.data.push({ ...two.items.data[0] });
    expect(() => readSubscription(two)).toThrow(SubscriptionShapeError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`:

```bash
npx vitest run src/utils/subscription-sync.test.ts
```

Expected: FAIL — cannot resolve `./subscription-sync`.

- [ ] **Step 3: Implement `backend/src/utils/subscription-sync.ts`**

```ts
/**
 * A subscription is the plan.
 *
 * The item's Price says which tier, its quantity says how many nurseries. That
 * makes this the only thing that needs reading to know what an account has
 * bought — no metadata, nothing the client ever influenced, and no replay
 * ledger, because re-running it re-reads current truth and writes the same
 * values.
 */

import Stripe from 'stripe';
import prisma from '../config/database';
import { getStripe } from './stripe';
import { parseLookupKey, type PlanTier } from './pricing';

export interface SubscriptionSnapshot {
  planTier: PlanTier;
  paidNurseryCount: number;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
}

/** A subscription that could not have been sold by this application. */
export class SubscriptionShapeError extends Error {}

const secondsToDate = (seconds: number | null | undefined): Date | null =>
  typeof seconds === 'number' ? new Date(seconds * 1000) : null;

const customerId = (customer: Stripe.Subscription['customer']): string | null => {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
};

/**
 * Pure translation. Throws rather than defaulting on anything it does not
 * recognise: a Price nobody here created, or a second line item, means the
 * subscription was assembled somewhere else, and quietly calling it Standard
 * would silently downgrade a paying customer.
 */
export function readSubscription(sub: Stripe.Subscription): SubscriptionSnapshot {
  const items = sub.items?.data ?? [];

  if (items.length !== 1) {
    throw new SubscriptionShapeError(
      `Subscription ${sub.id} has ${items.length} items; every plan sold here has exactly one.`
    );
  }

  const item = items[0];
  const parsed = parseLookupKey(item.price?.lookup_key);

  if (!parsed) {
    throw new SubscriptionShapeError(
      `Subscription ${sub.id} is on price ${item.price?.id ?? 'unknown'}, which has no ` +
        'recognised lookup key. It was not created by this application.'
    );
  }

  return {
    planTier: parsed.tier,
    paidNurseryCount: item.quantity ?? 1,
    subscriptionStatus: sub.status,
    // This API version keeps the period end on the item, not the subscription.
    currentPeriodEnd: secondsToDate(item.current_period_end),
    cancelAt: secondsToDate(sub.cancel_at),
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: sub.id,
  };
}

/**
 * Re-fetches the subscription and writes it onto the account.
 *
 * Re-fetches rather than trusting a webhook payload because Stripe does not
 * guarantee event ordering, so a stale `subscription.updated` could otherwise
 * overwrite a newer one. One extra API call per event at this volume, and
 * every write is current truth by construction.
 */
export async function reconcileFromSubscription(
  subscriptionId: string,
  userId: string
): Promise<SubscriptionSnapshot> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const snapshot = readSubscription(sub);

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: snapshot.planTier,
      paidNurseryCount: snapshot.paidNurseryCount,
      subscriptionStatus: snapshot.subscriptionStatus,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      cancelAt: snapshot.cancelAt,
      stripeCustomerId: snapshot.stripeCustomerId,
      stripeSubscriptionId: snapshot.stripeSubscriptionId,
    },
  });

  return snapshot;
}

/**
 * Marks an account as no longer subscribed, keeping what it used to have.
 *
 * planTier and paidNurseryCount are deliberately left alone so admin can still
 * see that a lapsed account bought a Group of eight. isLive() is what hides
 * the listings.
 */
export async function clearSubscription(userId: string, status: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: status, cancelAt: null },
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `backend/`:

```bash
npx vitest run && npx tsc --noEmit
```

Expected: `subscription-sync.test.ts` PASS with 12 tests; everything else still PASS; `tsc` silent. A `tsc` error on `item.current_period_end` means the installed Stripe SDK is older than 20.4.1 — check `backend/node_modules/stripe/package.json` before working around it.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/subscription-sync.ts backend/src/utils/subscription-sync.test.ts
git commit -m "feat(billing): read plan state from the subscription, not from metadata"
```

---

### Task 6: Signup checkout becomes a subscription

The button already says "Monthly recurring payment. 90 days written notice required before renewal date to cancel." This is the change that makes it true.

**Files:**
- Modify: `backend/src/controllers/stripe.controller.ts:79-209` (`createCheckoutSession`)

**Interfaces:**
- Consumes: `ensurePlanPrices()`, `PlanPriceIds` (Task 2); `quote()`, `PricingError` (existing).
- Produces: nothing new. Signup metadata keeps exactly the fields the webhook uses to build the account.

- [ ] **Step 1: Swap the import**

In `backend/src/controllers/stripe.controller.ts`, replace line 7:

```ts
import { ensurePlanProducts, getStripe } from '../utils/stripe';
```

with:

```ts
import { ensurePlanPrices, ensurePlanProducts, getStripe } from '../utils/stripe';
```

- [ ] **Step 2: Replace the Checkout Session creation**

Replace lines 151–195 — from `const stripe = getStripe();` through the closing `});` of `checkout.sessions.create` — with:

```ts
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
```

Three things changed and each matters:

- `mode: 'subscription'` — the actual fix.
- `invoice_creation` is gone. Subscriptions invoice automatically; asking for it in subscription mode is an error.
- `plan`, `billingPeriod` and `nurseryCount` are gone from metadata. They were the client-influenced values that plan state used to be read from. The subscription carries all three now. What remains is only what is needed to *build the account*.

- [ ] **Step 3: Remove the now-dead line item description**

Delete line 115:

```ts
    const lineItem = describeQuote(priceQuote);
```

Leave the `describeQuote` import for now — the upgrade path below still uses it, and Task 8 removes both.

`quote()` stays exactly where it is. It is what refuses a Standard group and refuses 61+, before anything reaches Stripe, and the `inf` tier means Stripe itself would happily sell a group of 200 without it.

- [ ] **Step 4: Verify**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

Expected: `tsc` silent, tests PASS. A `tsc` error saying `invoice_creation` is not assignable means it was not fully deleted.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/stripe.controller.ts
git commit -m "feat(checkout): sell signup as a subscription against a catalogue price"
```

---

### Task 7: Webhook drives everything from the subscription

Three events cover signup, upgrade, lapse and cancellation. No scheduled job.

`processed_checkout_sessions` stays, but its job narrows to account-creation idempotency — the webhook/redirect race. It no longer guards plan state, because the reconciler is idempotent by construction.

**Files:**
- Modify: `backend/src/controllers/stripe.controller.ts:17-70` (the `applyPurchase` / `reconcileAccount` helpers) and `:216-366` (`stripeWebhook`)

**Interfaces:**
- Consumes: `reconcileFromSubscription`, `clearSubscription`, `SubscriptionShapeError` (Task 5).
- Produces:
  - `ensureAccount(session): Promise<string | null>` — module-private; returns the user id the session belongs to, creating the account if this is the first time the session has been seen.

- [ ] **Step 1: Replace the purchase helpers**

Replace lines 17–70 of `backend/src/controllers/stripe.controller.ts` — the whole block from the `applyPurchase` doc comment through the end of `reconcileAccount` — with:

```ts
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
```

The account is created with the schema defaults — `planTier: 'standard'`, `paidNurseryCount: 1`, `subscriptionStatus: 'none'` — and the reconciler immediately overwrites all three from the subscription. It is never live before that write lands, so a half-finished signup fails closed.

`planTier: 'pending'` on the ledger row is a marker, not a plan: the column is now only a record of what claimed the session, and nothing reads it.

- [ ] **Step 2: Replace the webhook body**

Replace the entire `stripeWebhook` export (lines 216–366 before this task's edits) with:

```ts
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
```

- [ ] **Step 3: Add the imports**

Add to the imports at the top of `backend/src/controllers/stripe.controller.ts`:

```ts
import {
  SubscriptionShapeError,
  clearSubscription,
  reconcileFromSubscription,
} from '../utils/subscription-sync';
```

Remove `planFromMetadata` from the `../utils/entitlements` import — the webhook was its only consumer here. Leave the function itself and its tests in place until Task 8, which removes the last caller.

- [ ] **Step 4: Verify**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

Expected: `tsc` silent, tests PASS. `tsc` will flag `verifySession` and `verifyUpgradeSession` if they still call the deleted `reconcileAccount` — that is expected, and Task 8 rewrites both. If you need a green build at this commit, do Steps 1–3 of Task 8 before committing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/stripe.controller.ts
git commit -m "feat(webhook): reconcile from the subscription on every billing event"
```

---

### Task 8: In-place upgrades — `preview-change` and `apply-change`

An upgrade stops being a second checkout and becomes a subscription update, prorated against the card on file. The upgrade page gets real numbers instead of a Stripe redirect.

An account with no live subscription — never subscribed, or lapsed — has nothing to update, so it still goes through Checkout. Both paths exist and `preview-change` says which one applies.

**Files:**
- Modify: `backend/src/controllers/stripe.controller.ts` — replace `createUpgradeSession`, `verifyUpgradeSession` and `verifySession`; add `previewChange` and `applyChange`
- Modify: `backend/src/routes/stripe.routes.ts`
- Modify: `backend/src/utils/pricing.ts` — delete `describeQuote`
- Modify: `backend/src/utils/pricing.test.ts` — delete the `describeQuote` block
- Modify: `backend/src/utils/entitlements.ts` — delete `planFromMetadata`
- Modify: `backend/src/utils/entitlements.test.ts` — delete the `planFromMetadata` block

**Interfaces:**
- Consumes: `ensurePlanPrices()` (Task 2), `reconcileFromSubscription` (Task 5), `quote()` / `PricingError` / `priceLookupKey` / `parseLookupKey` (Task 1).
- Produces, all authenticated:
  - `POST /api/stripe/preview-change` → `{ success, data: { requiresCheckout: boolean, amountDueNowPence: number, nextRenewalPence: number, nextRenewalDate: string | null, intervalChanges: boolean, currency: string, targetLabel: string } }`
  - `POST /api/stripe/apply-change` → `{ success, data: { planTier, paidNurseryCount, subscriptionStatus } }`
  - `POST /api/stripe/create-upgrade-session` → `{ success, url }` (reactivation only, now `mode: 'subscription'`)
  - `POST /api/stripe/verify-upgrade-session` → `{ success, data: { planTier, paidNurseryCount } }`

Request body for both change endpoints: `{ plan: 'standard' | 'platinum', billingPeriod: 'monthly' | 'annual', nurseryCount: number }`.

- [ ] **Step 1: Add a shared validator above `createUpgradeSession`**

Both endpoints validate identically, and a difference between them would be a way to buy something the other refuses. Insert into `backend/src/controllers/stripe.controller.ts`, just above `createUpgradeSession`:

```ts
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
 */
async function validateChange(
  userId: string,
  body: any
): Promise<{ ok: true; change: ChangeRequest } | { ok: false; rejection: ChangeRejection }> {
  const tier: PlanTier = body.plan === 'platinum' ? 'platinum' : 'standard';
  const billing: BillingPeriod = body.billingPeriod === 'annual' ? 'annual' : 'monthly';

  const requested = Number(body.nurseryCount);
  const count = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 0;

  // An allowance cannot be bought down below what is already in use, or the
  // owner would keep listings they have stopped paying for. Removing
  // nurseries first is the supported way down.
  const inUse = await prisma.nursery.count({ where: { ownerId: userId } });
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
```

- [ ] **Step 2: Add `previewChange`**

Insert after `validateChange`:

```ts
/**
 * POST /api/stripe/preview-change
 *
 * What this change costs right now and what it renews at. No charge, no
 * redirect — the upgrade page becomes a confirmation screen with real numbers.
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
```

- [ ] **Step 3: Add `applyChange`**

Insert after `previewChange`:

```ts
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

    const validated = await validateChange(userId, req.body);
    if (!validated.ok) {
      return res.status(validated.rejection.status).json(validated.rejection.body);
    }
    const { tier, billing, count } = validated.change;

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

    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: prices[tier][billing], quantity: count }],
      proration_behavior: 'always_invoice',
    });

    const snapshot = await reconcileFromSubscription(updated.id, userId);

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
```

- [ ] **Step 4: Rewrite `createUpgradeSession` as reactivation-only**

Replace the whole `createUpgradeSession` export with:

```ts
/**
 * POST /api/stripe/create-upgrade-session
 *
 * Checkout for an account with no live subscription — never subscribed, or
 * lapsed. An account that *has* one uses apply-change instead, which needs no
 * redirect.
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
      message: error?.message || 'Failed to create checkout session. Please try again.',
    });
  }
};
```

- [ ] **Step 5: Rewrite `verifyUpgradeSession` to reconcile**

Replace the whole `verifyUpgradeSession` export with:

```ts
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
```

- [ ] **Step 6: Rewrite `verifySession` to use `ensureAccount` + the reconciler**

Replace the whole `verifySession` export with:

```ts
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
```

- [ ] **Step 7: Fix the imports and delete what is now unused**

The import block at the top of `backend/src/controllers/stripe.controller.ts` should end up as:

```ts
import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { config } from '../config';
import { hashPassword } from '../utils';
import { generateShortId } from '../utils/id-generator';
import { ensurePlanPrices, getStripe } from '../utils/stripe';
import {
  quote,
  parseLookupKey,
  PricingError,
  type PlanTier,
  type BillingPeriod,
} from '../utils/pricing';
import { isLive, planLabel } from '../utils/entitlements';
import {
  SubscriptionShapeError,
  clearSubscription,
  reconcileFromSubscription,
} from '../utils/subscription-sync';
```

`ensurePlanProducts` is no longer imported here — `ensurePlanPrices()` calls it internally, and `coupon.controller.ts` still imports it directly for `applies_to.products`, so leave that export alone.

Then delete three things that now have no callers:

1. `describeQuote` in `backend/src/utils/pricing.ts` (currently lines 131–157, including the `formatGbp` helper it is the only user of). Its "Recurring subscription — 90 days written notice" wording now lives in the Checkout `custom_text`, which is where the customer actually reads it.
2. The `describe('describeQuote', ...)` block in `backend/src/utils/pricing.test.ts`, and `describeQuote` from that file's import.
3. `planFromMetadata` in `backend/src/utils/entitlements.ts` (currently lines 87–104), its `MIN_GROUP_SIZE` import if nothing else in the file uses it, and the `describe('planFromMetadata', ...)` block in `backend/src/utils/entitlements.test.ts`.

Metadata is no longer load-bearing for anything financial, so the forced-platinum normaliser that existed to make untrusted metadata safe has nothing left to protect.

- [ ] **Step 8: Wire the routes**

Replace `backend/src/routes/stripe.routes.ts` with:

```ts
import { Router } from 'express';
import {
  applyChange,
  createCheckoutSession,
  createUpgradeSession,
  previewChange,
  verifySession,
  verifyUpgradeSession,
} from '../controllers/stripe.controller';
import { authenticate } from '../middleware';

const router = Router();

// Signup (public – called from the signup form)
router.post('/create-checkout-session', createCheckoutSession);
router.post('/verify-session', verifySession);

// Changing an existing plan, in place, with no Stripe redirect
router.post('/preview-change', authenticate, previewChange);
router.post('/apply-change', authenticate, applyChange);

// Reactivation for an account with no live subscription — still a redirect,
// because there is no subscription to update and no card guaranteed on file
router.post('/create-upgrade-session', authenticate, createUpgradeSession);
router.post('/verify-upgrade-session', authenticate, verifyUpgradeSession);

// NOTE: The webhook route is mounted directly in server.ts
// with express.raw() body parser, not here with express.json()

export default router;
```

- [ ] **Step 9: Verify**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

Expected: `tsc` silent — this is the first commit since Task 7 where the controller compiles. Tests PASS; the suite is smaller now that the `describeQuote` and `planFromMetadata` blocks are gone.

- [ ] **Step 10: Commit**

```bash
git add backend/src/controllers/stripe.controller.ts backend/src/routes/stripe.routes.ts backend/src/utils/pricing.ts backend/src/utils/pricing.test.ts backend/src/utils/entitlements.ts backend/src/utils/entitlements.test.ts
git commit -m "feat(billing): upgrade in place with a prorated charge, no redirect"
```

---

### Task 9: One shared filter for every public nursery query

Six public queries, none sharing a filter. Without this the subscription work does nothing visible: a lapsed owner's listing stays on the site.

**Files:**
- Create: `backend/src/utils/public-visibility.ts`
- Create: `backend/src/utils/public-visibility.test.ts`
- Modify: `backend/src/controllers/user.nursery.controller.ts` — five call sites

**Interfaces:**
- Consumes: `LIVE_SUBSCRIPTION_STATUSES` (Task 4).
- Produces: `PUBLIC_NURSERY_WHERE` — spread into the `where` of every public nursery query.

- [ ] **Step 1: Write the failing test**

Create `backend/src/utils/public-visibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_NURSERY_WHERE } from './public-visibility';

// process.cwd(), not __dirname — vitest transforms to ESM, where __dirname
// does not exist regardless of what tsconfig says. Vitest runs from backend/.
const source = readFileSync(
  join(process.cwd(), 'src/controllers/user.nursery.controller.ts'),
  'utf8'
);

/**
 * The one public nursery query that deliberately omits the filter.
 *
 * searchNurseries backs the "leave a review" flow. A parent must be able to
 * review any nursery they attended, and a review cannot be blocked because the
 * owner stopped paying.
 */
const ALLOWED_WITHOUT_FILTER = new Set(['searchNurseries']);

interface Block {
  name: string;
  body: string;
}

function exportedBlocks(src: string): Block[] {
  return src
    .split(/^export const /m)
    .slice(1)
    .map((part) => ({ name: part.split(/[^A-Za-z0-9_]/)[0], body: part }));
}

const queriesNurseries = (body: string): boolean =>
  /\.nursery\.(findMany|findFirst|findUnique|count)/.test(body);

describe('PUBLIC_NURSERY_WHERE', () => {
  it('requires approval', () => {
    expect(PUBLIC_NURSERY_WHERE.isApproved).toBe(true);
  });

  it('accepts an owner who is live, or an admin', () => {
    expect(PUBLIC_NURSERY_WHERE.owner.OR).toEqual([
      { role: 'ADMIN' },
      { subscriptionStatus: { in: ['active', 'trialing', 'past_due'] } },
    ]);
  });
});

describe('user.nursery.controller.ts', () => {
  it('finds the public queries at all, so this test cannot pass vacuously', () => {
    const withQueries = exportedBlocks(source).filter((b) => queriesNurseries(b.body));
    expect(withQueries.length).toBeGreaterThanOrEqual(4);
  });

  it('uses the shared filter in every public nursery query', () => {
    const offenders = exportedBlocks(source)
      .filter((b) => queriesNurseries(b.body))
      .filter((b) => !ALLOWED_WITHOUT_FILTER.has(b.name))
      .filter((b) => !b.body.includes('PUBLIC_NURSERY_WHERE'))
      .map((b) => b.name);

    expect(
      offenders,
      'These queries hand-roll their own filter. A lapsed owner stays on the ' +
        'site through every one of them.'
    ).toEqual([]);
  });

  it('never counts nurseries on a group without the filter', () => {
    expect(source).not.toMatch(/nurseries:\s*\{\s*where:\s*\{\s*isApproved/);
  });

  it('keeps the documented exception, so the allowlist cannot rot', () => {
    for (const name of ALLOWED_WITHOUT_FILTER) {
      expect(source, `${name} is allowlisted but no longer exists`).toContain(
        `export const ${name}`
      );
    }
  });

  it('does not look a nursery up by slug alone', () => {
    expect(
      source,
      'findUnique cannot take a relation filter. getNurseryBySlug must use ' +
        'findFirst, or the detail page stays indexed after a lapse.'
    ).not.toMatch(/findUnique\(\{\s*where:\s*\{\s*slug\s*\}/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`:

```bash
npx vitest run src/utils/public-visibility.test.ts
```

Expected: FAIL — cannot resolve `./public-visibility`.

- [ ] **Step 3: Implement `backend/src/utils/public-visibility.ts`**

```ts
/**
 * Who the public can see.
 *
 * A survey of the backend found six public nursery queries, none sharing a
 * filter. This is the one place that answers the question, so hiding a lapsed
 * account's listings is a single edit rather than six that have to agree.
 *
 * Nursery.ownerId is non-nullable, so every nursery joins to a user and the
 * relation filter can never silently match nothing.
 */

import { LIVE_SUBSCRIPTION_STATUSES } from './entitlements';

export const PUBLIC_NURSERY_WHERE = {
  isApproved: true,
  owner: {
    OR: [
      // Admin-created nurseries have no subscription and never should. This
      // mirrors the ADMIN pass-through already in requireFeature.
      { role: 'ADMIN' as const },
      { subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
    ],
  },
};
```

- [ ] **Step 4: Apply it to the five public queries**

All five are in `backend/src/controllers/user.nursery.controller.ts`. Add the import at the top of that file:

```ts
import { PUBLIC_NURSERY_WHERE } from '../utils/public-visibility';
```

**4a. `autocompleteSearch`** (around line 139). Replace:

```ts
      where: {
        isApproved: true,
        OR: [
```

with:

```ts
      where: {
        ...PUBLIC_NURSERY_WHERE,
        OR: [
```

**4b. `searchByCity`, the nested group count** (around line 445). Replace:

```ts
            nurseries: {
              where: {
                isApproved: true
              }
            }
```

with:

```ts
            nurseries: {
              where: PUBLIC_NURSERY_WHERE
            }
```

**4c. `searchByCity`, the nursery list** (around line 460). Replace:

```ts
      where: {
        isApproved: true,
        city: { equals: city, mode: 'insensitive' },
      },
```

with:

```ts
      where: {
        ...PUBLIC_NURSERY_WHERE,
        city: { equals: city, mode: 'insensitive' },
      },
```

**4d. `getAllNurseries`, the shared `where` object** (around line 514). Replace:

```ts
    const where: any = {
      isApproved: true,
```

with:

```ts
    const where: any = {
      ...PUBLIC_NURSERY_WHERE,
```

The `prisma.nursery.count({ where })` further down reuses this same object, so it is covered by the one edit.

**4e. `getNurseryBySlug`** (around line 683). This one is a behaviour change beyond subscriptions: it has no approval filter at all today, so any unapproved nursery is publicly readable by slug. It cannot be left — the detail page is what stays indexed after a lapse, so without this the whole feature does nothing.

`findUnique` only accepts unique fields and will not take a relation filter, so it must become `findFirst`. Replace:

```ts
    const nursery = await (prisma as any).nursery.findUnique({
      where: { slug },
```

with:

```ts
    const nursery = await (prisma as any).nursery.findFirst({
      where: { slug, ...PUBLIC_NURSERY_WHERE },
```

**4f. `searchNurseries`** — leave exactly as it is. It is the allowlisted exception.

- [ ] **Step 5: Run the tests to verify they pass**

Run from `backend/`:

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all suites PASS including the six new assertions; `tsc` silent. If the "finds the public queries at all" test fails, `exportedBlocks` is not matching the file's declaration style — fix the test, not the controller, and say so in the commit.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/public-visibility.ts backend/src/utils/public-visibility.test.ts backend/src/controllers/user.nursery.controller.ts
git commit -m "feat(public): hide listings whose owner is not paying, via one shared filter"
```

---

### Task 10: The dashboard gates ask about billing too

`createNursery` already refuses (Task 4). The other two gates catch up, and the dashboard learns enough to warn during a past-due window.

**Files:**
- Modify: `backend/src/middleware/entitlement.ts`
- Modify: `backend/src/controllers/nursery-dashboard.controller.ts` — the entitlements endpoint (around lines 587–612)
- Modify: `frontend/lib/api/nursery.ts` — the `Entitlements` type

**Interfaces:**
- Consumes: `isLive()` (Task 4).
- Produces: the entitlements response gains `subscriptionStatus: string`, `isLive: boolean`, `currentPeriodEnd: string | null`, `cancelAt: string | null`.

- [ ] **Step 1: Make `requireFeature` check the subscription**

In `backend/src/middleware/entitlement.ts`, add `isLive` to the import:

```ts
import { features, isLive, planLabel, type PlanFeatures } from '../utils/entitlements';
```

Widen the select to include the status:

```ts
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, paidNurseryCount: true, subscriptionStatus: true },
    });
```

Then insert this check between the `if (!account)` guard and the existing `features(account)[feature]` check:

```ts
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
```

The `req.user?.role === 'ADMIN'` early return above it stays where it is, so admins are unaffected.

- [ ] **Step 2: Report billing state from the entitlements endpoint**

In `backend/src/controllers/nursery-dashboard.controller.ts`, widen the select in the entitlements handler:

```ts
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        planTier: true,
        paidNurseryCount: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        cancelAt: true,
      },
    });
```

and the response:

```ts
    res.json({
      success: true,
      data: {
        planTier: normaliseTier(account.planTier),
        paidNurseryCount: account.paidNurseryCount,
        planLabel: planLabel(account),
        isGroup: isGroup(account),
        features: features(account),
        allowance: allowance(account, used),
        // What was bought is reported separately from whether it is currently
        // paid for, so the dashboard can say "your Group of 8 has lapsed"
        // rather than pretending the account is a Single Standard.
        subscriptionStatus: account.subscriptionStatus,
        isLive: isLive(account),
        currentPeriodEnd: account.currentPeriodEnd,
        cancelAt: account.cancelAt,
      },
    });
```

Add `isLive` to that file's `../utils/entitlements` import.

- [ ] **Step 3: Widen the frontend type**

In `frontend/lib/api/nursery.ts`, add to the `Entitlements` interface:

```ts
  /** Stripe's status string, or "none" for an account that never subscribed. */
  subscriptionStatus: string;
  /** True for active, trialing and past_due. */
  isLive: boolean;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
```

- [ ] **Step 4: Verify**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

then from `frontend/`:

```bash
npx tsc --noEmit
```

Expected: all silent/PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/entitlement.ts backend/src/controllers/nursery-dashboard.controller.ts frontend/lib/api/nursery.ts
git commit -m "feat(entitlements): gate features on a live subscription and report why"
```

---

### Task 11: Admin can see and end a subscription

Admin-only by decision — there is no self-serve cancellation and no Stripe Billing Portal, because the 90-day notice term is real and someone has to check it was given.

**Files:**
- Create: `backend/src/controllers/admin-subscription.controller.ts`
- Modify: `backend/src/controllers/admin.controller.ts` — `getSubscriptions` (lines 488–548)
- Modify: `backend/src/routes/admin.routes.ts`

`admin.controller.ts` is already long, so the two new actions go in their own file rather than growing it further. `getSubscriptions` stays where it is — it is a read that belongs with the other admin reads.

**Interfaces:**
- Consumes: `getStripe()`, `reconcileFromSubscription`, `clearSubscription`, `isLive`.
- Produces:
  - `POST /api/admin/subscriptions/:userId/schedule-cancellation`, body `{ cancelAt?: string }` (ISO date; defaults to 90 days out)
  - `POST /api/admin/subscriptions/:userId/cancel-now`
  - `getSubscriptions` response gains `subscriptionStatus`, `isLive`, `currentPeriodEnd`, `cancelAt`.

- [ ] **Step 1: Add the billing columns to `getSubscriptions`**

In `backend/src/controllers/admin.controller.ts`, add to the `select` in `getSubscriptions`:

```ts
        subscriptionStatus: true,
        currentPeriodEnd: true,
        cancelAt: true,
        stripeSubscriptionId: true,
```

and to the mapped object, replacing the existing `status` field:

```ts
        // Two different questions that used to share one word. `status` is the
        // account (can they sign in), `subscriptionStatus` is the money.
        status: owner.isActive
          ? 'active'
          : owner.isVerified
            ? 'suspended'
            : 'pending',
        subscriptionStatus: owner.subscriptionStatus,
        isLive: isLive(owner),
        currentPeriodEnd: owner.currentPeriodEnd,
        cancelAt: owner.cancelAt,
        canCancel: Boolean(owner.stripeSubscriptionId) && isLive(owner),
```

Add `isLive` to that file's `../utils/entitlements` import.

- [ ] **Step 2: Create `backend/src/controllers/admin-subscription.controller.ts`**

```ts
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

/** The notice period the Checkout button promises. */
const NOTICE_DAYS = 90;

const noticeDefault = (): Date =>
  new Date(Date.now() + NOTICE_DAYS * 24 * 60 * 60 * 1000);

async function subscriptionFor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, stripeSubscriptionId: true },
  });
  if (!user) return { error: { status: 404, message: 'User not found.' } } as const;
  if (!user.stripeSubscriptionId) {
    return { error: { status: 409, message: 'This account has no subscription to cancel.' } } as const;
  }
  return { user, subscriptionId: user.stripeSubscriptionId } as const;
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
    if ('error' in found) {
      return res.status(found.error.status).json({ success: false, message: found.error.message });
    }

    const requested = req.body?.cancelAt ? new Date(req.body.cancelAt) : noticeDefault();
    if (Number.isNaN(requested.getTime())) {
      return res.status(400).json({ success: false, message: 'That is not a valid date.' });
    }
    if (requested.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'A scheduled cancellation must be in the future. Use "cancel immediately" instead.',
      });
    }

    await getStripe().subscriptions.update(found.subscriptionId, {
      cancel_at: Math.floor(requested.getTime() / 1000),
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
    if ('error' in found) {
      return res.status(found.error.status).json({ success: false, message: found.error.message });
    }

    const cancelled = await getStripe().subscriptions.cancel(found.subscriptionId);
    await clearSubscription(found.user.id, cancelled.status);

    res.json({ success: true, data: { subscriptionStatus: cancelled.status, cancelAt: null } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Wire the routes**

In `backend/src/routes/admin.routes.ts`, add the import:

```ts
import { cancelImmediately, scheduleCancellation } from '../controllers/admin-subscription.controller';
```

and, below the existing `router.get('/subscriptions', getSubscriptions);` line:

```ts
router.post('/subscriptions/:userId/schedule-cancellation', scheduleCancellation);
router.post('/subscriptions/:userId/cancel-now', cancelImmediately);
```

Both sit under the `router.use(authenticate, authorize('ADMIN'))` already in that file, so no extra guard is needed.

- [ ] **Step 4: Extend the admin API client**

In `frontend/lib/api/admin.ts`, add to `AdminSubscription`:

```ts
  /** Stripe's status string, or "none". Distinct from `status`, which is the account. */
  subscriptionStatus: string;
  isLive: boolean;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  canCancel: boolean;
```

and to `adminService`:

```ts
  scheduleCancellation: async (userId: string, cancelAt?: string) => {
    return adminApiClient.post<{ subscriptionStatus: string; cancelAt: string | null }>(
      `/admin/subscriptions/${userId}/schedule-cancellation`,
      cancelAt ? { cancelAt } : {},
      true
    );
  },

  cancelSubscriptionNow: async (userId: string) => {
    return adminApiClient.post<{ subscriptionStatus: string; cancelAt: string | null }>(
      `/admin/subscriptions/${userId}/cancel-now`,
      {},
      true
    );
  },
```

Check the surrounding methods in that file for the exact `adminApiClient.post` signature and match it — the third argument is the "send auth token" flag used by `getSubscriptions`.

- [ ] **Step 5: Show it in the admin table**

In `frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx`, in the "Nursery Plans" table:

Add two headers after `<th className="p-3 text-left">Status</th>`:

```tsx
                      <th className="p-3 text-left">Billing</th>
                      <th className="p-3 text-left">Renews</th>
                      <th className="p-3 text-left">Actions</th>
```

Add the matching cells after the existing status `<td>`:

```tsx
                        <td className="px-3 py-5">
                          <Badge className={item.isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {item.subscriptionStatus.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-5 text-sm text-muted-foreground">
                          {item.cancelAt
                            ? `Ends ${formatDate(item.cancelAt)}`
                            : item.currentPeriodEnd
                              ? formatDate(item.currentPeriodEnd)
                              : '—'}
                        </td>
                        <td className="px-3 py-5">
                          {item.canCancel ? (
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleSchedule(item)}>
                                Schedule
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleCancelNow(item)}>
                                Cancel now
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
```

Bump every `colSpan={7}` in that table's loading and empty rows to `colSpan={10}`.

Add the two handlers next to `handleDeactivateCoupon`:

```tsx
  const handleSchedule = async (item: AdminSubscription) => {
    const suggested = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const answer = window.prompt(
      `End ${item.ownerName || item.email}'s subscription on which date? ` +
        'Billing continues until then. 90 days is the notice period.',
      suggested
    );
    if (!answer) return;

    try {
      const response = await adminService.scheduleCancellation(item.id, answer);
      if (!response.success) throw new Error(response.message || 'Failed to schedule cancellation');
      toast.success(`Cancellation scheduled for ${formatDate(answer)}`);
      loadSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule cancellation');
    }
  };

  const handleCancelNow = async (item: AdminSubscription) => {
    if (!window.confirm(
      `Cancel ${item.ownerName || item.email}'s subscription immediately? ` +
        'Their listings come off the site straight away. Their data is kept and ' +
        'this can be reversed by starting a new subscription.'
    )) return;

    try {
      const response = await adminService.cancelSubscriptionNow(item.id);
      if (!response.success) throw new Error(response.message || 'Failed to cancel subscription');
      toast.success('Subscription cancelled');
      loadSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };
```

- [ ] **Step 6: Verify**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

then from `frontend/`:

```bash
npx tsc --noEmit && npm run build
```

Expected: all silent/PASS. A `tsc` error on `subscriptions.cancel` means the SDK method is `del` on an older major — check `node_modules/stripe/types/SubscriptionsResource.d.ts` before changing anything else.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/admin-subscription.controller.ts backend/src/controllers/admin.controller.ts backend/src/routes/admin.routes.ts frontend/lib/api/admin.ts frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx
git commit -m "feat(admin): show billing status and schedule or force a cancellation"
```

---

### Task 12: Payment History reads invoices, not sessions

Renewals are invoices, not Checkout Sessions. Left alone, every renewal payment after the first would be invisible in the admin panel.

This also settles a review finding from 2026-07-30: session-based history could not tell Single Platinum from a Group, because both were "platinum". The invoice line carries the quantity.

**Files:**
- Modify: `backend/src/controllers/payment-history.controller.ts` (replace the file)
- Modify: `frontend/lib/api/admin.ts` — `AdminPaymentRecord`
- Modify: `frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx` — the Invoice History table

**Interfaces:**
- Consumes: `parseLookupKey` (Task 1), `planLabel` (existing).
- Produces: `AdminPaymentRecord` gains `quantity: number` and `planLabel: string`; `paymentStatus` becomes the invoice status union `'draft' | 'open' | 'paid' | 'uncollectible' | 'void'`.

- [ ] **Step 1: Replace `backend/src/controllers/payment-history.controller.ts`**

```ts
/**
 * Every payment, including renewals.
 *
 * This used to list Checkout Sessions, which only exist for the first payment.
 * Once plans renew, a session list shows the signup and nothing after it.
 *
 * The plan comes off the invoice line's price lookup key and the nursery count
 * off its quantity, so a Group of 8 and a Single Platinum are finally
 * distinguishable — they were both just "platinum" when this read metadata.
 */

import { NextFunction, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware';
import { getStripe } from '../utils/stripe';
import { parseLookupKey } from '../utils/pricing';
import { planLabel } from '../utils/entitlements';

function firstLine(invoice: Stripe.Invoice): Stripe.InvoiceLineItem | null {
  return invoice.lines?.data?.[0] ?? null;
}

function lookupKeyOf(line: Stripe.InvoiceLineItem | null): string | null {
  const pricing = (line as any)?.pricing?.price_details;
  return (line as any)?.price?.lookup_key ?? pricing?.lookup_key ?? null;
}

function formatInvoice(invoice: Stripe.Invoice) {
  const line = firstLine(invoice);
  const parsed = parseLookupKey(lookupKeyOf(line));
  const quantity = line?.quantity ?? 1;

  return {
    id: invoice.id,
    customerName: invoice.customer_name || null,
    customerEmail: invoice.customer_email || null,
    plan: parsed?.tier ?? null,
    planLabel: parsed
      ? planLabel({ planTier: parsed.tier, paidNurseryCount: quantity })
      : 'Unknown plan',
    quantity,
    billingPeriod: parsed?.billing ?? null,
    currency: invoice.currency || 'gbp',
    subtotal: invoice.subtotal ?? 0,
    discount: invoice.total_discount_amounts?.reduce((sum, d) => sum + d.amount, 0) ?? 0,
    total: invoice.total ?? 0,
    paymentStatus: invoice.status ?? 'draft',
    createdAt: new Date(invoice.created * 1000),
    invoiceNumber: invoice.number || null,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    invoicePdf: invoice.invoice_pdf || null,
    receiptUrl: null,
  };
}

export const listPaymentHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stripe = getStripe();
    const invoices: Stripe.Invoice[] = [];
    let startingAfter: string | undefined;

    do {
      const page = await stripe.invoices.list({
        limit: 100,
        starting_after: startingAfter,
      });
      invoices.push(...page.data);
      startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    } while (startingAfter);

    // Drafts are not payments yet. Everything else — paid, open, void,
    // uncollectible — is worth seeing, because a failed renewal is exactly
    // what someone is looking for when they open this table.
    const payments = invoices
      .filter((invoice) => invoice.status !== 'draft')
      .filter((invoice) => parseLookupKey(lookupKeyOf(firstLine(invoice))) !== null)
      .map(formatInvoice);

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
```

`receiptUrl` is kept as `null` rather than removed, so the frontend's fallback link keeps type-checking while the invoice URLs do the real work.

If `tsc` rejects `(line as any).pricing`, drop that half of `lookupKeyOf` — the `as any` is there precisely because the invoice line's price location moved between API versions and only one of the two shapes will exist.

- [ ] **Step 2: Update the frontend type**

In `frontend/lib/api/admin.ts`, replace `AdminPaymentRecord` with:

```ts
export interface AdminPaymentRecord {
  id: string;
  customerName?: string | null;
  customerEmail?: string | null;
  plan: 'standard' | 'platinum' | null;
  /** Server-decided wording: "Single Standard" | "Single Platinum" | "Group of 8". */
  planLabel: string;
  /** Nurseries this invoice covered. This is what tells a Group from a Single. */
  quantity: number;
  billingPeriod?: 'monthly' | 'annual' | null;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentStatus: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  createdAt: string;
  invoiceNumber?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  receiptUrl?: string | null;
}
```

- [ ] **Step 3: Update the Invoice History table**

In `frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx`:

Replace `PAYMENT_STATUS_STYLES` and `paymentStatusLabel` with:

```tsx
const PAYMENT_STATUS_STYLES: Record<AdminPaymentRecord['paymentStatus'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  uncollectible: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-600',
};

function paymentStatusLabel(status: AdminPaymentRecord['paymentStatus']) {
  if (status === 'open') return 'Unpaid';
  if (status === 'uncollectible') return 'Failed';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
```

Replace the plan cell:

```tsx
                        <td className="px-3 py-5 font-medium capitalize">{payment.plan}</td>
```

with:

```tsx
                        <td className="px-3 py-5 font-medium">{payment.planLabel}</td>
```

Change the empty-state message from "No completed Stripe payments found." to "No invoices found."

- [ ] **Step 4: Verify**

Run from `backend/`:

```bash
npx tsc --noEmit && npm test
```

then from `frontend/`:

```bash
npx tsc --noEmit && npm run build
```

Expected: all silent/PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/payment-history.controller.ts frontend/lib/api/admin.ts frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx
git commit -m "feat(admin): read payment history from invoices so renewals are visible"
```

---

### Task 13: The upgrade page confirms a real number instead of redirecting

Today the upgrade button computes a price locally and sends the owner to
Stripe. With a live subscription there is no redirect: the card on file is
charged the prorated difference. The owner must therefore see the *actual*
amount before agreeing, because it is not the sticker price — it is a
proration Stripe computes.

The page keeps its whole existing layout. Only the CTA path changes: pressing
the button now fetches a preview and swaps to a confirmation panel. The Stripe
redirect survives as the `requiresCheckout` branch, which is what a lapsed or
never-subscribed account gets.

**Files:**
- Modify: `frontend/lib/api/auth.ts` — add `previewChange` and `applyChange`
- Modify: `frontend/app/nursery-dashboard/upgrade/page.tsx`

**Interfaces:**
- Consumes: `POST /api/stripe/preview-change` and `POST /api/stripe/apply-change` (Task 8); `useEntitlements()` as widened in Task 10.
- Produces: `authService.previewChange(planTier, billingPeriod, nurseryCount) => Promise<ApiResponse<ChangePreview>>` and `authService.applyChange(planTier, billingPeriod, nurseryCount) => Promise<ApiResponse<ChangeResult>>`.

- [ ] **Step 1: Add the two client methods**

In `frontend/lib/api/auth.ts`, add these interfaces immediately after
`UpgradeResult`:

```ts
/** What preview-change hands back. Amounts are pence, as everywhere else. */
export interface ChangePreview {
  /** True when there is no live subscription to update — go via Stripe. */
  requiresCheckout: boolean;
  amountDueNowPence: number;
  nextRenewalPence: number;
  /** Null when the interval changes, because the cycle is about to reset. */
  nextRenewalDate: string | null;
  intervalChanges: boolean;
  currency: string;
  targetLabel: string;
}

export interface ChangeResult {
  planTier: 'standard' | 'platinum';
  paidNurseryCount: number;
  subscriptionStatus: string;
}
```

and these two methods inside `authService`, immediately above
`createUpgradeSession`:

```ts
  // Price a plan change without committing to it. The number that comes back
  // is Stripe's proration, not the sticker price, so it is the only figure
  // safe to show on a confirmation screen.
  previewChange: async (
    planTier: 'standard' | 'platinum',
    billingPeriod: 'monthly' | 'annual',
    nurseryCount: number
  ): Promise<ApiResponse<ChangePreview>> => {
    return nurseryApiClient.post<ChangePreview>(
      '/stripe/preview-change',
      { plan: planTier, billingPeriod, nurseryCount },
      true
    );
  },

  // Commit the change. Charges the card on file — there is no Stripe redirect.
  applyChange: async (
    planTier: 'standard' | 'platinum',
    billingPeriod: 'monthly' | 'annual',
    nurseryCount: number
  ): Promise<ApiResponse<ChangeResult>> => {
    const response = await nurseryApiClient.post<ChangeResult>(
      '/stripe/apply-change',
      { plan: planTier, billingPeriod, nurseryCount },
      true
    );
    if (response.success && response.data?.planTier) {
      const { planTier: tier, paidNurseryCount } = response.data;
      try {
        for (const key of ['nurseryUser', 'user']) {
          const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          if (!raw) continue;
          const stored = JSON.parse(raw);
          stored.planTier = tier;
          stored.paidNurseryCount = paidNurseryCount;
          localStorage.setItem(key, JSON.stringify(stored));
        }
      } catch { /* ignore parse errors */ }
    }
    return response;
  },
```

- [ ] **Step 2: Add the confirm state to the upgrade page**

In `frontend/app/nursery-dashboard/upgrade/page.tsx`, widen the import on
line 6:

```tsx
import { authService, type ChangePreview } from '@/lib/api/auth';
```

Then replace the status declaration (lines 40-42):

```tsx
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'cancelled'>(
    cancelled ? 'cancelled' : upgraded && sessionId ? 'verifying' : 'idle'
  );
```

with:

```tsx
  const [status, setStatus] = useState<
    'idle' | 'confirming' | 'verifying' | 'success' | 'error' | 'cancelled'
  >(cancelled ? 'cancelled' : upgraded && sessionId ? 'verifying' : 'idle');
  const [preview, setPreview] = useState<ChangePreview | null>(null);
```

- [ ] **Step 3: Split `handleUpgrade` into preview and confirm**

Replace the whole `handleUpgrade` function (lines 111-137) with:

```tsx
  // Step one of two. Asks the server what this actually costs right now.
  // A lapsed or never-subscribed account comes back `requiresCheckout` and
  // still goes to Stripe, because there is no card on file to charge.
  const handleUpgrade = async () => {
    // The button already says "Contact us for a quote" up here; without this
    // guard it POSTs anyway and the server rejects the unpriced group.
    if (upgradeQuote.bespoke) {
      router.push('/contact-us');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.previewChange('platinum', billingPeriod, targetCount);
      if (!res.success || !res.data) {
        setErrorMsg(res.message || 'Could not price that change. Please try again.');
        setStatus('error');
        return;
      }

      if (res.data.requiresCheckout) {
        const session = await authService.createUpgradeSession('platinum', billingPeriod, targetCount);
        if (session.url) {
          window.location.href = session.url;
        } else {
          setErrorMsg(session.message || 'The server did not return a payment link. Please try again.');
          setStatus('error');
        }
        return;
      }

      setPreview(res.data);
      setStatus('confirming');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not reach the server. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Step two. Charges the card on file. There is no redirect, so on success
  // the page goes straight to the state it would otherwise have returned to.
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await authService.applyChange('platinum', billingPeriod, targetCount);
      if (res.success && res.data) {
        setNewPlanLabel(planLabel(res.data.planTier, res.data.paidNurseryCount));
        setStatus('success');
      } else {
        setErrorMsg(res.message || 'The change could not be applied. Please try again.');
        setStatus('error');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not reach the server. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Render the confirmation screen**

Insert this block immediately above the `// ── Success state ──` comment
(currently line 139):

```tsx
  // ── Confirm state ──────────────────────────────────────────────
  // The one screen where the numbers are Stripe's rather than ours. Amount
  // due now is a proration and will not match the sticker price.
  if (status === 'confirming' && preview) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="rounded-2xl border border-yellow-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Confirm your upgrade</h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            You&apos;re moving to {preview.targetLabel}.
          </p>

          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
            <div className="flex items-baseline justify-between px-4 py-4">
              <span className="text-sm text-gray-600">Due today</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatGbp(preview.amountDueNowPence)}
              </span>
            </div>
            <div className="flex items-baseline justify-between px-4 py-4">
              <span className="text-sm text-gray-600">
                {billingPeriod === 'monthly' ? 'Then per month' : 'Then per year'}
              </span>
              <span className="text-base font-semibold text-gray-800">
                {formatGbp(preview.nextRenewalPence)}
              </span>
            </div>
            {preview.nextRenewalDate && (
              <div className="flex items-baseline justify-between px-4 py-4">
                <span className="text-sm text-gray-600">Next payment</span>
                <span className="text-base font-semibold text-gray-800">
                  {new Date(preview.nextRenewalDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-6">
            {preview.intervalChanges
              ? 'Changing your billing period restarts your billing cycle today, so this charge covers a full new period less credit for time you have already paid for.'
              : 'Today\u2019s charge covers the rest of your current billing period. Your renewal date does not change.'}
          </p>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Charging your card…</>
            ) : (
              <><Zap size={16} className="fill-yellow-900" /> Pay {formatGbp(preview.amountDueNowPence)} and upgrade</>
            )}
          </button>
          <button
            onClick={() => { setPreview(null); setStatus('idle'); }}
            disabled={loading}
            className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 transition disabled:opacity-60"
          >
            Back
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Charged to the card already on your account · 90 days notice required to cancel
          </p>
        </div>
      </div>
    );
  }
```

- [ ] **Step 5: Update the CTA wording on the idle screen**

The button no longer takes payment — it fetches a price. Replace the loading
label on the idle CTA (currently line 364):

```tsx
            <><Loader2 size={16} className="animate-spin" /> Redirecting to payment…</>
```

with:

```tsx
            <><Loader2 size={16} className="animate-spin" /> Checking your price…</>
```

and the resting label (currently line 368):

```tsx
              : `Upgrade Now — ${formatGbp(upgradeQuote.totalPence)}/${billingPeriod === 'monthly' ? 'mo' : 'yr'}`}</>
```

with:

```tsx
              : `Review upgrade — ${formatGbp(upgradeQuote.totalPence)}/${billingPeriod === 'monthly' ? 'mo' : 'yr'}`}</>
```

- [ ] **Step 6: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit && npm run build
```

Expected: no type errors, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/api/auth.ts frontend/app/nursery-dashboard/upgrade/page.tsx
git commit -m "feat(upgrade): confirm the real prorated amount instead of redirecting to Stripe"
```

---

### Task 14: Rollout — do not un-list the live site

`subscriptionStatus` defaults to `'none'`, and `'none'` is not live. The moment
Task 9's filter ships, every nursery whose owner is not an ADMIN and has no
backfilled status vanishes from the public site. Every existing owner predates
subscriptions, so that is all of them.

This task is deliberately last and deliberately manual: it requires looking at
the production database before writing anything to it.

**Files:**
- Create: `backend/prisma/migrations/20260731000100_backfill_subscription_status/migration.sql`

**Interfaces:**
- Consumes: the columns added in Task 3.
- Produces: nothing code-facing.

- [ ] **Step 1: Look at what is actually in the database**

Migrations in this repo are applied to Railway by hand. Before writing the
backfill, run this against the production database and read the output:

```sql
SELECT u.id, u.email, u.role, u."planTier", u."paidNurseryCount",
       u."stripeSubscriptionId", u."subscriptionStatus",
       COUNT(n.id) AS nurseries
FROM "User" u
LEFT JOIN "Nursery" n ON n."ownerId" = u.id
WHERE u.role IN ('ADMIN', 'NURSERY_OWNER')
GROUP BY u.id
ORDER BY nurseries DESC;
```

Three groups come out of it, handled differently:

| Group | Treatment |
|---|---|
| ADMIN owners | Nothing. The ADMIN branch of `PUBLIC_NURSERY_WHERE` covers them. |
| Real paying owners | Grandfather to `'active'`. They paid; they keep their listing. |
| Demo / seed / test accounts | Leave at `'none'`. They should not be public. |

If it is not obvious from the output which is which, stop and ask Matt before
running anything. Un-listing a paying nursery and publishing a test one are
both worse than a delay.

- [ ] **Step 2: Write the backfill migration**

Create `backend/prisma/migrations/20260731000100_backfill_subscription_status/migration.sql`:

```sql
-- Backfill: subscriptionStatus defaults to 'none', which is not live, so
-- without this every pre-subscription owner's nurseries disappear from the
-- public site the moment PUBLIC_NURSERY_WHERE ships.
--
-- Grandfathers exactly the accounts that are already visible: owners with at
-- least one approved nursery. Anything unapproved stays at 'none' and stays
-- invisible, which it already was.
--
-- These accounts have no Stripe subscription behind them. They are marked
-- 'active' as a deliberate manual grant, not as a mirror of Stripe, and no
-- webhook will ever move them because stripeSubscriptionId is null.
UPDATE "User" u
SET "subscriptionStatus" = 'active'
WHERE u.role = 'NURSERY_OWNER'
  AND u."subscriptionStatus" = 'none'
  AND EXISTS (
    SELECT 1 FROM "Nursery" n
    WHERE n."ownerId" = u.id AND n."isApproved" = true
  );
```

If Step 1 identified demo or seed accounts inside that population, add an
exclusion before the closing `);`:

```sql
  AND u.email NOT IN ('<address from step 1>', '<address from step 1>')
```

Use the real addresses from Step 1. If there are none to exclude, omit the
clause entirely rather than inventing placeholders.

- [ ] **Step 3: Verify the migration is a no-op for visibility**

Run this against the same database before and after applying. The "after"
number is what the public site will show:

```sql
SELECT COUNT(*) FROM "Nursery" n
JOIN "User" u ON u.id = n."ownerId"
WHERE n."isApproved" = true
  AND (u.role = 'ADMIN' OR u."subscriptionStatus" IN ('active','trialing','past_due'));
```

Compare it against the current public total:

```sql
SELECT COUNT(*) FROM "Nursery" WHERE "isApproved" = true;
```

A shortfall is the number of listings about to disappear. It should be zero,
or exactly the demo accounts excluded in Step 2.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/migrations/20260731000100_backfill_subscription_status/migration.sql
git commit -m "chore(db): grandfather existing owners so live listings survive the subscription gate"
```

- [ ] **Step 5: Apply both migrations to Railway, in order**

By hand, in this order, with the counts from Step 3 taken either side:

1. `20260731000000_add_subscription_columns`
2. `20260731000100_backfill_subscription_status`

Between the two, every non-ADMIN listing is hidden. Keep the gap short.

---

### Task 15: Stripe test-mode smoke test

Nothing in Tasks 1-14 exercises Stripe. The unit tests cover pure functions and
file contents by convention, which leaves every webhook, proration and Price
object unverified by anything but this. Run it before the change is considered
done.

**Files:** none. This is a manual verification pass.

**Interfaces:**
- Consumes: everything.
- Produces: a go / no-go.

- [ ] **Step 1: Point the environment at Stripe test mode**

Confirm `STRIPE_SECRET_KEY` in `backend/.env` starts with `sk_test_`. If it
starts with `sk_live_`, stop — the rest of this task creates real charges.

Forward webhooks to the local server in a second terminal:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

Put the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` and restart the
backend.

- [ ] **Step 2: Signup creates a subscription, not a charge**

Sign up a new nursery owner on Standard monthly and pay with
`4242 4242 4242 4242`, any future expiry, any CVC.

In the Stripe test dashboard:
- A **Subscription** exists, status `active` — not just a one-off payment
- Its single item's price has lookup key `mathew_standard_monthly_v1`
- Quantity is 1

In the database:

```sql
SELECT "planTier", "paidNurseryCount", "subscriptionStatus",
       "stripeCustomerId", "stripeSubscriptionId", "currentPeriodEnd"
FROM "User" WHERE email = '<the new owner>';
```

Expected: `standard`, `1`, `active`, all three Stripe fields populated,
`currentPeriodEnd` roughly one month out. A null `currentPeriodEnd` means
`readSubscription` looked in the wrong place — it is on the item, not the
subscription.

- [ ] **Step 3: A renewal actually happens**

The whole point of the change. In the Stripe dashboard, attach the subscription
to a test clock and advance the clock past the period end.

Expected:
- A second invoice, paid
- `customer.subscription.updated` received by the local listener
- `currentPeriodEnd` in the database has moved forward
- The renewal appears in admin Payment History — it is an invoice, not a
  session, so this is the case the old `checkout.sessions.list` could not see

- [ ] **Step 4: Upgrade charges a proration in place**

As that owner, go to `/nursery-dashboard/upgrade`, choose Platinum, and press
the CTA.

Expected:
- No redirect to Stripe
- "Due today" is *less* than the full Platinum price, because it is prorated
- Confirming charges the card and returns to the dashboard on Platinum
- In Stripe, the **same** subscription now has the Platinum price — no second
  subscription was created
- Quantity is still correct. If it reset to 1, the explicit `quantity` in
  `subscriptions.update` was dropped.

Then repeat with a count change to 5. Expected: price object unchanged,
quantity 5, `paidNurseryCount` 5.

- [ ] **Step 5: Cancellation hides listings, and reactivation restores them**

Note which nurseries are visible at `/nurseries`. In the admin panel, use
**Cancel now** on that owner.

Expected:
- `customer.subscription.deleted` received
- `subscriptionStatus` becomes `canceled`
- Those nurseries disappear from `/nurseries`, from the group pages, and from
  their own `/nursery/<slug>` detail page
- They remain reviewable through search — that is the documented exception
- `planTier` and `paidNurseryCount` are **unchanged**; the record of what was
  bought survives
- Nothing was deleted

Then use **Schedule cancellation** on a second owner instead. Expected: status
stays `active`, `cancelAt` is set 90 days out, listings stay up.

Finally, reactivate the cancelled owner through the upgrade page — which takes
the `requiresCheckout` branch — and confirm the same nurseries come back on
their own.

- [ ] **Step 6: The past-due window keeps a nursery up**

Update the subscription's payment method to `4000 0000 0000 0341` (attaches
successfully, fails on charge) and advance the test clock past renewal.

Expected: status `past_due`, listings **still visible**, dashboard shows the
warning. This is deliberate — a card that expired on a Friday must not pull a
nursery off the site before anyone can fix it.

- [ ] **Step 7: Record the result**

If every step passed, the change is done. If any step failed, fix it and re-run
from Step 2 — the states compound, and a partial re-run can pass on stale data.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Four Prices, volume ladder, versioned lookup keys | 1, 2 |
| `User` columns (+ `cancelAt`, documented deviation above) | 3 |
| `isLive()`, gate composition | 4, 10 |
| `reconcileFromSubscription` replacing metadata | 5 |
| Signup as `mode: 'subscription'` | 6 |
| Three webhook events | 7 |
| `preview-change` / `apply-change`, `always_invoice` | 8, 13 |
| `PUBLIC_NURSERY_WHERE`, `getNurseryBySlug`, `searchNurseries` exception | 9 |
| Admin status columns and two cancel actions | 11 |
| Payment History from `invoices.list` | 12 |
| Catalogue verification on first checkout, not at boot | 2, 6 |
| Webhooks re-fetch rather than trust the payload | 5, 7 |
| Tests: tiers, version bump, `isLive`, gates, file-reading filter test | 1, 4, 9 |
| Rollout of existing owners | 14 |

The spec's out-of-scope items — self-serve cancellation, the Billing Portal,
migrating existing subscribers to a new Price version, band monotonicity,
dunning email — correctly have no tasks.

**Placeholders:** none. Every code step carries complete code and every command
states its expected output. The two places that decline to supply values —
Task 14 Step 1 and the exclusion list in Step 2 — do so because they require
reading the production database first, where inventing values would be worse
than pausing.

**Type consistency:** `SubscriptionSnapshot` (Task 5) is consumed under the
same field names in Tasks 7, 8 and 11. `PlanPriceIds` is indexed
`[tier][billing]` in Tasks 2, 6 and 8. `ChangePreview` (Task 13) matches the
`preview-change` response shape declared in Task 8 field for field.
`LIVE_SUBSCRIPTION_STATUSES` (Task 4) is the single source for the status list
used in Tasks 9, 10, 11 and the Task 14 SQL.
