# Single / Group plans — implementation plan

Design: `docs/superpowers/specs/2026-07-30-single-group-plans-design.md`
Date: 2026-07-30

> **For the agentic worker:** Execute tasks in order. Each task is self-contained
> — it names every file it touches and gives the complete code, not a sketch. Do
> not skip the failing-test step; the point of running the test before the
> implementation is to prove the test can fail. If a step's expected output does
> not match what you see, stop and report rather than adjusting the test to pass.
> Commit at the end of every task so a bad task can be reverted alone.

## Goal

Make Single Standard, Single Platinum and Group three distinct sellable
products; store the number of nurseries paid for; and enforce that number on the
server. Today `quote('platinum', billing, 1)` throws, so Single Platinum cannot
be bought at all, and the nursery count exists only in Stripe metadata that
nothing reads back.

Done means:

- A one-nursery owner can buy Platinum at £38.60/mo.
- `paidNurseryCount` is persisted on every purchase path and `createNursery`
  refuses to exceed it.
- Job / video / team-member endpoints check the tier server-side, not just in
  the UI.
- Admin sees `used / paid` per account.
- `pricing.ts` and `entitlements.ts` have unit tests covering every rate, band
  boundary and rejection.

## Architecture

Two columns on `User` replace one:

```
planTier          "standard" | "platinum"     -> what features are unlocked
paidNurseryCount  Int                          -> how many nurseries are allowed
```

"Group" is derived (`paidNurseryCount >= 2`), never stored, so it cannot
contradict the count.

Two backend modules own the two questions:

| Module | Question | Reads |
|---|---|---|
| `utils/pricing.ts` | what does this cost | nothing from the DB — pure |
| `utils/entitlements.ts` | what is this account allowed to do | the two columns |

`features()` reads `planTier` only and `allowance()` reads `paidNurseryCount`
only, so a tier change cannot move the limit and vice versa.

Every purchase path (webhook, `verify-session`, `verify-upgrade-session`) funnels
into one `reconcileAccount()` so they cannot drift apart.

## Tech Stack

- Backend: Express + TypeScript (CommonJS, ES2020, strict), Prisma, Stripe SDK
- Frontend: Next.js App Router, React, Tailwind
- Tests: **vitest** — new. The backend has no test framework today. Vitest runs
  TypeScript with no build step and no config file, which suits a CommonJS
  `ts-node-dev` project better than Jest + ts-jest.

## Global Constraints

1. **The client never sends a price.** It sends `(tier, billing, nurseryCount)`;
   the server derives money from `quote()`. Any code that trusts a
   client-supplied amount is a bug.
2. **Invalid combinations throw.** No falling back to a default rate. A wrong
   price is worse than a failed checkout.
3. **Money is pence, integers only.** No floats anywhere in pricing.
4. **`mathew_plan` metadata values stay `standard` / `platinum`.**
   `ensurePlanProducts()` (`utils/stripe.ts:37`) matches on it and
   `coupon.controller.ts:98` pins coupons to the resulting product IDs. Product
   *display names* may be renamed freely; the metadata key may not.
5. **Do not switch `price_data.product` to `price_data.product_data`.** The
   design doc proposes this; it is wrong. `product_data` makes Stripe mint a new
   ad-hoc product per checkout, and every coupon's
   `applies_to: { products: [...] }` restriction would then fail to match,
   silently killing all promotion codes. The line-item detail from
   `describeQuote()` goes into `invoice_creation.invoice_data.description`
   instead, which is a real field and reaches the customer's invoice.
6. **No backfill.** There are no live customers, so the migration may drop
   `plan` outright.
7. **Server-side gates are the gate.** The frontend may still read a plan hint
   from `localStorage` for display, but no access decision may depend on it.

---

## Task 1: Test harness + `pricing.ts` rewrite

Adds vitest, then makes Single Platinum purchasable by splitting the flat rate
per tier instead of assuming platinum means group.

**Files:**
- `backend/package.json` — modify
- `backend/src/utils/pricing.ts` — rewrite
- `backend/src/utils/pricing.test.ts` — create

**Interfaces:**

Produces:
```ts
export type PlanTier = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

export const SINGLE_STANDARD_MONTHLY_PENCE = 2395;
export const SINGLE_PLATINUM_MONTHLY_PENCE = 3860;
export const BESPOKE_THRESHOLD = 61;
export const MIN_GROUP_SIZE = 2;
export const GROUP_BANDS: readonly GroupBand[];

export interface GroupBand {
  min: number; max: number; unitPence: number; discountPercent: number;
}
export function findGroupBand(nurseryCount: number): GroupBand | null;

export interface PriceQuote {
  tier: PlanTier;
  billing: BillingPeriod;
  quantity: number;
  unitAmountPence: number;
  totalPence: number;
  discountPercent: number;
  isGroup: boolean;
}
export class PricingError extends Error {}
export function quote(tier: PlanTier, billing: BillingPeriod, nurseryCount: number): PriceQuote;
export function describeQuote(q: PriceQuote): { label: string; description: string };
```

Consumes: nothing.

Breaking change: `PlanKey` -> `PlanTier`, `PriceQuote.planKey` -> `.tier`.
`stripe.controller.ts` imports `PlanKey` from here and will not compile until
Task 4. That is expected — Task 4 fixes it.

**Steps:**

- [ ] Add to `backend/package.json` `devDependencies`: `"vitest": "^2.1.9"`.
      Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] Run `cd backend && npm install`. Expect vitest to install cleanly.
- [ ] Write `backend/src/utils/pricing.test.ts` with the failing tests below.

```ts
import { describe, it, expect } from 'vitest';
import {
  quote,
  describeQuote,
  findGroupBand,
  PricingError,
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
  type PlanTier,
} from './pricing';

describe('single rates', () => {
  it('charges £23.95 for one standard nursery', () => {
    const q = quote('standard', 'monthly', 1);
    expect(q.unitAmountPence).toBe(2395);
    expect(q.totalPence).toBe(2395);
    expect(q.discountPercent).toBe(0);
    expect(q.isGroup).toBe(false);
  });

  it('charges £38.60 for one platinum nursery', () => {
    const q = quote('platinum', 'monthly', 1);
    expect(q.unitAmountPence).toBe(3860);
    expect(q.totalPence).toBe(3860);
    expect(q.discountPercent).toBe(0);
    expect(q.isGroup).toBe(false);
  });

  it('exports the two single rates', () => {
    expect(SINGLE_STANDARD_MONTHLY_PENCE).toBe(2395);
    expect(SINGLE_PLATINUM_MONTHLY_PENCE).toBe(3860);
  });
});

describe('group bands', () => {
  const cases: Array<[number, number, number]> = [
    // [count, unitPence, discountPercent] — both edges of every band
    [2, 3474, 10],
    [5, 3474, 10],
    [6, 3088, 20],
    [15, 3088, 20],
    [16, 2702, 30],
    [30, 2702, 30],
    [31, 2316, 40],
    [60, 2316, 40],
  ];

  it.each(cases)('%i nurseries bills at %ip each (%i%% off)', (count, unit, discount) => {
    const q = quote('platinum', 'monthly', count);
    expect(q.unitAmountPence).toBe(unit);
    expect(q.totalPence).toBe(unit * count);
    expect(q.discountPercent).toBe(discount);
    expect(q.isGroup).toBe(true);
  });

  it('bands are contiguous and cover 2..60', () => {
    for (let n = 2; n <= 60; n++) {
      expect(findGroupBand(n), `no band for ${n}`).not.toBeNull();
    }
    expect(findGroupBand(1)).toBeNull();
    expect(findGroupBand(61)).toBeNull();
  });

  it('band rates are the advertised discounts off the single platinum rate', () => {
    for (const band of GROUP_BANDS) {
      const expected = Math.round(
        SINGLE_PLATINUM_MONTHLY_PENCE * (1 - band.discountPercent / 100)
      );
      expect(band.unitPence).toBe(expected);
    }
  });
});

describe('annual billing', () => {
  it('is twelve times monthly with no extra discount', () => {
    for (const count of [1, 2, 6, 16, 31, 60]) {
      const tier: PlanTier = count === 1 ? 'standard' : 'platinum';
      const m = quote(tier, 'monthly', count);
      const a = quote(tier, 'annual', count);
      expect(a.unitAmountPence).toBe(m.unitAmountPence * 12);
      expect(a.totalPence).toBe(m.totalPence * 12);
      expect(a.discountPercent).toBe(m.discountPercent);
    }
  });

  it('charges annual single platinum at £463.20', () => {
    expect(quote('platinum', 'annual', 1).totalPence).toBe(46320);
  });
});

describe('rejections', () => {
  it('refuses standard for more than one nursery', () => {
    expect(() => quote('standard', 'monthly', 2)).toThrow(PricingError);
    expect(() => quote('standard', 'monthly', 2)).toThrow(/Group.*Platinum/i);
  });

  it('refuses 61 or more as self-serve', () => {
    expect(() => quote('platinum', 'monthly', 61)).toThrow(PricingError);
    expect(() => quote('platinum', 'monthly', 500)).toThrow(PricingError);
  });

  it('refuses non-integer, zero and negative counts', () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => quote('platinum', 'monthly', bad), `count ${bad}`).toThrow(PricingError);
    }
  });
});

describe('describeQuote', () => {
  it('names single platinum without a discount note', () => {
    const d = describeQuote(quote('platinum', 'monthly', 1));
    expect(d.label).toBe('Single Platinum Nursery Listing – Monthly');
    expect(d.description).toContain('1 nursery');
    expect(d.description).not.toContain('discount');
  });

  it('names a group with its size and discount', () => {
    const d = describeQuote(quote('platinum', 'monthly', 8));
    expect(d.label).toBe('Group Nursery Listing (8 nurseries) – Monthly');
    expect(d.description).toContain('20% group discount');
    expect(d.description).toContain('£247.04');
  });
});
```

- [ ] Run `cd backend && npm test`. Expect failures — `quote` does not accept
      these arguments and `isGroup` does not exist.
- [ ] Rewrite `backend/src/utils/pricing.ts`:

```ts
/**
 * Single source of truth for what a nursery listing costs.
 *
 * Three products:
 *
 *   Single Standard  — one nursery, £23.95/mo
 *   Single Platinum  — one nursery, £38.60/mo
 *   Group            — two or more, Platinum features at a volume discount
 *
 * "Group" is not a tier of its own. It is the Platinum tier bought for more
 * than one nursery, which is why the band rates are 10/20/30/40% off the
 * single Platinum rate. There is no Standard group.
 *
 * The total is the per-nursery rate times the nursery count. Annual is the
 * monthly rate x 12; paying yearly earns no further discount.
 *
 * Prices are in pence to keep away from floating point — Stripe wants pence
 * anyway. The frontend mirrors this table for display only; this file is what
 * actually gets charged.
 */

export type PlanTier = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

/** One nursery, standard features. */
export const SINGLE_STANDARD_MONTHLY_PENCE = 2395;

/** One nursery, platinum features. The base the group bands discount from. */
export const SINGLE_PLATINUM_MONTHLY_PENCE = 3860;

/** Group size at or above which pricing is negotiated rather than self-serve. */
export const BESPOKE_THRESHOLD = 61;

/** The smallest group. One nursery is a Single, not a Group. */
export const MIN_GROUP_SIZE = 2;

export interface GroupBand {
  min: number;
  max: number;
  /** Per-nursery monthly rate, in pence. */
  unitPence: number;
  /** Headline discount, for display only — the rate above is authoritative. */
  discountPercent: number;
}

export const GROUP_BANDS: readonly GroupBand[] = [
  { min: 2, max: 5, unitPence: 3474, discountPercent: 10 },
  { min: 6, max: 15, unitPence: 3088, discountPercent: 20 },
  { min: 16, max: 30, unitPence: 2702, discountPercent: 30 },
  { min: 31, max: 60, unitPence: 2316, discountPercent: 40 },
];

export function findGroupBand(nurseryCount: number): GroupBand | null {
  return GROUP_BANDS.find((b) => nurseryCount >= b.min && nurseryCount <= b.max) ?? null;
}

export interface PriceQuote {
  tier: PlanTier;
  billing: BillingPeriod;
  /** How many nurseries this subscription covers. */
  quantity: number;
  /** Charged per nursery, per billing period, in pence. */
  unitAmountPence: number;
  /** unitAmountPence x quantity. */
  totalPence: number;
  discountPercent: number;
  /** Derived, never stored: two or more nurseries is a Group. */
  isGroup: boolean;
}

export class PricingError extends Error {}

/**
 * Works out what to charge. Throws rather than falling back to a default —
 * a wrong price is worse than a failed checkout.
 */
export function quote(
  tier: PlanTier,
  billing: BillingPeriod,
  nurseryCount: number
): PriceQuote {
  if (!Number.isInteger(nurseryCount) || nurseryCount < 1) {
    throw new PricingError('Number of nurseries must be a whole number of at least 1.');
  }

  let unitMonthlyPence: number;
  let discountPercent: number;
  const isGroup = nurseryCount >= MIN_GROUP_SIZE;

  if (!isGroup) {
    unitMonthlyPence =
      tier === 'platinum' ? SINGLE_PLATINUM_MONTHLY_PENCE : SINGLE_STANDARD_MONTHLY_PENCE;
    discountPercent = 0;
  } else {
    if (tier !== 'platinum') {
      throw new PricingError(
        'A Group covers two or more nurseries and includes Platinum features. ' +
          'The Standard plan is for a single nursery.'
      );
    }
    if (nurseryCount >= BESPOKE_THRESHOLD) {
      throw new PricingError(
        `Groups of ${BESPOKE_THRESHOLD} or more are priced individually — please get in touch.`
      );
    }

    const band = findGroupBand(nurseryCount);
    if (!band) {
      // Unreachable while the bands stay contiguous, but a silent wrong price
      // is exactly what this module exists to prevent.
      throw new PricingError('No price band matches that number of nurseries.');
    }
    unitMonthlyPence = band.unitPence;
    discountPercent = band.discountPercent;
  }

  const unitAmountPence =
    billing === 'annual' ? unitMonthlyPence * 12 : unitMonthlyPence;

  return {
    tier,
    billing,
    quantity: nurseryCount,
    unitAmountPence,
    totalPence: unitAmountPence * nurseryCount,
    discountPercent,
    isGroup,
  };
}

const formatGbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/** Line item label and invoice description shown to the customer. */
export function describeQuote(q: PriceQuote): { label: string; description: string } {
  const productLabel = q.isGroup
    ? `Group Nursery Listing (${q.quantity} nurseries)`
    : q.tier === 'platinum'
      ? 'Single Platinum Nursery Listing'
      : 'Single Standard Nursery Listing';
  const periodLabel = q.billing === 'annual' ? 'Annual' : 'Monthly';
  const perNursery = formatGbp(q.unitAmountPence);
  const total = formatGbp(q.totalPence);
  const per = q.billing === 'annual' ? 'year' : 'month';

  const sites = q.quantity === 1 ? '1 nursery' : `${q.quantity} nurseries`;
  const discountNote =
    q.discountPercent > 0 ? ` Includes a ${q.discountPercent}% group discount.` : '';
  const annualNote = q.billing === 'annual' ? ' Paid upfront each year.' : '';

  return {
    label: `${productLabel} – ${periodLabel}`,
    description:
      `${sites} at ${perNursery} per nursery per ${per} — ${total} per ${per}.` +
      `${discountNote}${annualNote}` +
      ' Recurring subscription — 90 days written notice required before renewal date to cancel.',
  };
}
```

- [ ] Run `cd backend && npm test`. Expect all `pricing.test.ts` tests to pass.
- [ ] Run `cd backend && npx tsc --noEmit`. Expect errors **only** in
      `stripe.controller.ts` (`PlanKey` no longer exported, `.planKey` gone).
      Any error in another file means something was missed — stop and report.
- [ ] Commit: `feat(pricing): sell Single Standard, Single Platinum and Group separately`

---

## Task 2: `entitlements.ts`

The single answer to "what is this account allowed to do". Pure, so it is
testable without a database.

**Files:**
- `backend/src/utils/entitlements.ts` — create
- `backend/src/utils/entitlements.test.ts` — create

**Interfaces:**

Produces:
```ts
export interface PlanAccount {
  planTier: string | null;
  paidNurseryCount: number | null;
}
export interface PlanFeatures {
  jobs: boolean;
  video: boolean;
  teamMembers: boolean;
  reviewModeration: boolean;
  priorityPlacement: boolean;
  analytics: boolean;
}
export interface Allowance {
  paid: number;
  used: number;
  remaining: number;
}

export function normaliseTier(tier: string | null | undefined): PlanTier;
export function paidCount(account: PlanAccount): number;
export function isGroup(account: PlanAccount): boolean;
export function planLabel(account: PlanAccount): string;
export function features(account: PlanAccount): PlanFeatures;
export function allowance(account: PlanAccount, usedCount: number): Allowance;
export function canAddNursery(account: PlanAccount, usedCount: number): boolean;
```

Consumes: `PlanTier` from `./pricing`.

`PlanAccount` is deliberately structural, not the Prisma `User` type, so these
functions can be called with a partial `select` and unit-tested with a literal.

**Steps:**

- [ ] Write `backend/src/utils/entitlements.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  normaliseTier,
  isGroup,
  planLabel,
  features,
  allowance,
  canAddNursery,
} from './entitlements';

const single = (tier: string, paid = 1) => ({ planTier: tier, paidNurseryCount: paid });

describe('normaliseTier', () => {
  it('passes through known tiers', () => {
    expect(normaliseTier('standard')).toBe('standard');
    expect(normaliseTier('platinum')).toBe('platinum');
  });

  it('falls back to standard for anything unrecognised', () => {
    // Legacy rows carried plan: 'free'. Unknown must never mean platinum.
    for (const bad of ['free', '', 'PLATINUM', null, undefined]) {
      expect(normaliseTier(bad as any), `tier ${bad}`).toBe('standard');
    }
  });
});

describe('isGroup', () => {
  it('is two or more nurseries', () => {
    expect(isGroup(single('platinum', 1))).toBe(false);
    expect(isGroup(single('platinum', 2))).toBe(true);
    expect(isGroup(single('standard', 1))).toBe(false);
  });

  it('treats a missing count as one', () => {
    expect(isGroup({ planTier: 'platinum', paidNurseryCount: null })).toBe(false);
  });
});

describe('planLabel', () => {
  it('names all three products', () => {
    expect(planLabel(single('standard', 1))).toBe('Single Standard');
    expect(planLabel(single('platinum', 1))).toBe('Single Platinum');
    expect(planLabel(single('platinum', 8))).toBe('Group of 8');
  });

  it('never says Group Standard', () => {
    // Rejected at the pricing layer, but a hand-edited row must not crash.
    expect(planLabel(single('standard', 4))).toBe('Group of 4');
  });
});

describe('features', () => {
  it('unlocks everything on platinum regardless of count', () => {
    for (const paid of [1, 12]) {
      const f = features(single('platinum', paid));
      expect(f).toEqual({
        jobs: true,
        video: true,
        teamMembers: true,
        reviewModeration: true,
        priorityPlacement: true,
        analytics: true,
      });
    }
  });

  it('locks everything on standard regardless of count', () => {
    const f = features(single('standard', 1));
    expect(f).toEqual({
      jobs: false,
      video: false,
      teamMembers: false,
      reviewModeration: false,
      priorityPlacement: false,
      analytics: false,
    });
  });
});

describe('allowance', () => {
  it('reports remaining headroom', () => {
    expect(allowance(single('platinum', 5), 2)).toEqual({ paid: 5, used: 2, remaining: 3 });
    expect(allowance(single('platinum', 5), 5)).toEqual({ paid: 5, used: 5, remaining: 0 });
  });

  it('never reports negative headroom when over the limit', () => {
    expect(allowance(single('platinum', 5), 9)).toEqual({ paid: 5, used: 9, remaining: 0 });
  });

  it('treats an unpaid account as zero allowance', () => {
    expect(allowance({ planTier: 'standard', paidNurseryCount: 0 }, 0))
      .toEqual({ paid: 0, used: 0, remaining: 0 });
  });
});

describe('canAddNursery', () => {
  it('allows up to the paid count and no further', () => {
    expect(canAddNursery(single('standard', 1), 0)).toBe(true);
    expect(canAddNursery(single('standard', 1), 1)).toBe(false);
    expect(canAddNursery(single('platinum', 3), 2)).toBe(true);
    expect(canAddNursery(single('platinum', 3), 3)).toBe(false);
    expect(canAddNursery(single('platinum', 3), 4)).toBe(false);
  });

  it('blocks an unpaid account entirely', () => {
    expect(canAddNursery({ planTier: 'standard', paidNurseryCount: 0 }, 0)).toBe(false);
  });
});
```

- [ ] Run `cd backend && npm test`. Expect a module-not-found failure.
- [ ] Write `backend/src/utils/entitlements.ts`:

```ts
/**
 * What an account is allowed to do.
 *
 * Two independent questions, answered from one column each:
 *
 *   features()  reads planTier          — which capabilities are unlocked
 *   allowance() reads paidNurseryCount  — how many nurseries may exist
 *
 * Keeping them separate means changing tier cannot move the limit, and buying
 * more nurseries cannot change what is unlocked.
 *
 * "Group" is derived, never stored, so it cannot contradict the count.
 */

import type { PlanTier } from './pricing';

/**
 * Structural rather than Prisma's User so callers can pass a narrow `select`
 * and tests can pass a literal.
 */
export interface PlanAccount {
  planTier: string | null;
  paidNurseryCount: number | null;
}

export interface PlanFeatures {
  jobs: boolean;
  video: boolean;
  teamMembers: boolean;
  reviewModeration: boolean;
  priorityPlacement: boolean;
  analytics: boolean;
}

export interface Allowance {
  paid: number;
  used: number;
  /** Never negative — an over-limit account has no headroom, not minus some. */
  remaining: number;
}

/** Anything unrecognised is standard. Unknown must never grant platinum. */
export function normaliseTier(tier: string | null | undefined): PlanTier {
  return tier === 'platinum' ? 'platinum' : 'standard';
}

export function paidCount(account: PlanAccount): number {
  const n = account.paidNurseryCount;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 1;
}

export function isGroup(account: PlanAccount): boolean {
  return paidCount(account) >= 2;
}

/** The one place plan wording is decided, so no two screens can disagree. */
export function planLabel(account: PlanAccount): string {
  const paid = paidCount(account);
  if (paid >= 2) return `Group of ${paid}`;
  return normaliseTier(account.planTier) === 'platinum'
    ? 'Single Platinum'
    : 'Single Standard';
}

export function features(account: PlanAccount): PlanFeatures {
  const unlocked = normaliseTier(account.planTier) === 'platinum';
  return {
    jobs: unlocked,
    video: unlocked,
    teamMembers: unlocked,
    reviewModeration: unlocked,
    priorityPlacement: unlocked,
    analytics: unlocked,
  };
}

export function allowance(account: PlanAccount, usedCount: number): Allowance {
  const paid = paidCount(account);
  const used = Math.max(0, usedCount);
  return { paid, used, remaining: Math.max(0, paid - used) };
}

export function canAddNursery(account: PlanAccount, usedCount: number): boolean {
  return allowance(account, usedCount).remaining > 0;
}
```

- [ ] Run `cd backend && npm test`. Expect both test files to pass.
- [ ] Commit: `feat(entitlements): derive plan label, features and allowance in one place`

---

## Task 3: Schema migration

Replaces `User.plan` with `planTier` + `paidNurseryCount`.

**Files:**
- `backend/prisma/schema.prisma` — modify
- `backend/prisma/migrations/<timestamp>_split_plan_into_tier_and_count/migration.sql` — create

**Interfaces:**

Produces: `user.planTier: string`, `user.paidNurseryCount: number` on the Prisma
client. Removes `user.plan`.

Consumes: nothing.

After this task, everything that reads `user.plan` fails to compile. Tasks 4–6
fix them. Do not attempt to run the server between Task 3 and Task 6.

**Steps:**

- [ ] In `backend/prisma/schema.prisma`, replace line 35:

```prisma
  plan        String?     @default("standard") // "standard" | "platinum"
```

with:

```prisma
  planTier         String  @default("standard") // "standard" | "platinum"
  paidNurseryCount Int     @default(1)          // nurseries this account paid for
```

Both are non-nullable: an account always has a tier and an allowance, and a null
here would mean "unknown access", which nothing should have to handle.

- [ ] Create the migration directory and `migration.sql`:

```sql
-- Split User.plan into a feature tier and a paid nursery allowance.
-- No live customers, so `plan` is dropped rather than kept for backfill.

ALTER TABLE "users" ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "users" ADD COLUMN "paidNurseryCount" INTEGER NOT NULL DEFAULT 1;

-- Existing platinum accounts keep their tier. Legacy 'free' rows (unpaid
-- signups) fall to the standard default, which is what they had access to.
UPDATE "users" SET "planTier" = 'platinum' WHERE "plan" = 'platinum';

-- Unpaid signups have no allowance until they check out.
UPDATE "users" SET "paidNurseryCount" = 0 WHERE "plan" = 'free';

ALTER TABLE "users" DROP COLUMN "plan";
```

- [ ] Run `cd backend && npx prisma migrate dev --name split_plan_into_tier_and_count`.
      If prisma offers to generate the SQL itself, keep the file above — the
      `UPDATE` statements are the part prisma will not write.
- [ ] Run `cd backend && npx prisma generate`.
- [ ] Run `cd backend && npx tsc --noEmit`. Expect errors in
      `stripe.controller.ts`, `auth.controller.ts`, `admin.controller.ts` only.
      Record the list — Tasks 4–6 must clear exactly these.
- [ ] Commit: `feat(db): replace User.plan with planTier and paidNurseryCount`

---

## Task 4: Reconcile the account on every purchase path

One function writes the plan, called from all three completion paths, so a
Single owner who pays for a Group can no longer stay Single.

**Files:**
- `backend/src/utils/stripe.ts` — modify (product display names)
- `backend/src/controllers/stripe.controller.ts` — modify

**Interfaces:**

Produces, in `stripe.controller.ts`:
```ts
async function reconcileAccount(
  tx: { user: { update: Function } },
  userId: string,
  tier: PlanTier,
  paidNurseryCount: number
): Promise<void>;
```

Consumes: `quote`, `describeQuote`, `PricingError`, `PlanTier`, `BillingPeriod`
from `../utils/pricing`.

**Steps:**

- [ ] In `backend/src/utils/stripe.ts`, rename the display names only. The
      `mathew_plan` metadata keys stay `standard` / `platinum` (Global
      Constraint 4):

```ts
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
```

Leave `export type PlanKey = 'standard' | 'platinum';` in this file as-is — it
is the Stripe product key, which is a different thing from the plan tier and is
what `coupon.controller.ts` imports.

- [ ] In `stripe.controller.ts`, update the import block (lines 8–14):

```ts
import {
  quote,
  describeQuote,
  PricingError,
  type PlanTier,
  type BillingPeriod,
} from '../utils/pricing';
```

- [ ] Add `reconcileAccount` immediately after the imports:

```ts
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
```

- [ ] In `createCheckoutSession`, replace lines 39–62 (the tier/quote block):

```ts
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
```

- [ ] In `createCheckoutSession`, after the `existingUser` role check (after line
      78), reject a second group. `getMyGroup` and `createNursery` both use
      `findFirst`, so a second group is unreachable in the dashboard; sending
      them to upgrade routes them to the flow that works:

```ts
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
```

- [ ] In `createCheckoutSession`, change the `line_items` / add invoice data.
      Keep `product: products[tier]` — see Global Constraint 5. Replace lines
      89–100:

```ts
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
```

- [ ] In `createCheckoutSession`, update the metadata `plan` key to use `tier`
      (line 110): `plan: tier,`.
- [ ] In `stripeWebhook`, the existing-user branch (lines 182–202) must
      reconcile as well as create the group. Wrap it in a transaction:

```ts
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
```

- [ ] In `stripeWebhook`, the new-user branch: replace `plan: meta.plan || 'standard',`
      (line 227) with the two columns. Add above the `$transaction` call:

```ts
      const { tier, count } = planFromMetadata(meta);
```

and inside `tx.user.create`:

```ts
            planTier: tier,
            paidNurseryCount: count,
```

- [ ] In `createUpgradeSession`, replace lines 282–318:

```ts
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
```

The old `plan !== 'platinum'` rejection goes: a Group owner shrinking to Single
Standard is a legitimate plan change through the same flow. `quote()` still
rejects standard with a count above one, so nothing invalid gets priced.

- [ ] In `createUpgradeSession`, update the session to match — `invoice_data`,
      `products[tier]`, `priceQuote.unitAmountPence`, and metadata `plan: tier`:

```ts
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
```

- [ ] In `verifyUpgradeSession`, replace the update (lines 400–405):

```ts
    const { tier, count } = planFromMetadata(meta);

    await reconcileAccount(prisma, meta.userId, tier, count);

    return res.json({
      success: true,
      data: { planTier: tier, paidNurseryCount: count },
    });
```

- [ ] In `verifySession`, the early return on an existing user (lines 446–449) is
      the bug that leaves a paying owner on their old plan. Replace it:

```ts
    const { tier, count } = planFromMetadata(meta);

    // Idempotent — the webhook may have got here first. Still reconcile, so a
    // purchase always lands on the account even when creation was skipped.
    const existingUser = await prisma.user.findUnique({ where: { email: meta.email } });
    if (existingUser) {
      await reconcileAccount(prisma, existingUser.id, tier, count);
      return res.json({ success: true, alreadyExists: true });
    }
```

- [ ] In `verifySession`, replace `plan: meta.plan || 'standard',` (line 465):

```ts
          planTier: tier,
          paidNurseryCount: count,
```

- [ ] Run `cd backend && npx tsc --noEmit`. Expect `stripe.controller.ts` to be
      clean; `auth.controller.ts` and `admin.controller.ts` still fail.
- [ ] Commit: `feat(stripe): reconcile planTier and paidNurseryCount on every purchase path`

---

## Task 5: Server-side enforcement

The allowance and the feature gates become real. Today `createNursery` has no
check at all and the platinum gates live only in `use-nursery-plan.ts`, which
reads `localStorage` — editing one storage key unlocks the whole Platinum UI.

**Files:**
- `backend/src/middleware/entitlement.ts` — create
- `backend/src/middleware/index.ts` — modify
- `backend/src/controllers/nursery-dashboard.controller.ts` — modify
- `backend/src/controllers/auth.controller.ts` — modify
- `backend/src/routes/job.routes.ts` — modify
- `backend/src/routes/team-member.routes.ts` — modify
- `backend/src/routes/review.routes.ts` — modify
- `backend/src/routes/nursery-dashboard.routes.ts` — modify

**Interfaces:**

Produces:
```ts
// middleware/entitlement.ts
export function requireFeature(
  feature: keyof PlanFeatures
): (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;

// nursery-dashboard.controller.ts
export const getMyEntitlements: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>;
// GET /api/nursery-dashboard/entitlements ->
// { success: true, data: { planTier, paidNurseryCount, planLabel, isGroup, features, allowance } }
```

Consumes: `features`, `allowance`, `canAddNursery`, `planLabel`, `isGroup`,
`normaliseTier` from `../utils/entitlements`.

**Steps:**

- [ ] Create `backend/src/middleware/entitlement.ts`:

```ts
import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';
import { features, planLabel, type PlanFeatures } from '../utils/entitlements';

/**
 * Blocks a route unless the account's tier unlocks the named feature.
 *
 * These are gated in the dashboard UI too, but the UI reads the plan from
 * localStorage, so the UI check is a convenience and this is the actual gate.
 *
 * ADMIN passes through — admins act on behalf of any account.
 */
export function requireFeature(feature: keyof PlanFeatures) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (req.user?.role === 'ADMIN') return next();

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, paidNurseryCount: true },
    });

    if (!account) {
      return res.status(401).json({ success: false, message: 'Account not found.' });
    }

    if (!features(account)[feature]) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_NOT_IN_PLAN',
        feature,
        planLabel: planLabel(account),
        message: 'This feature is available on the Platinum plan.',
      });
    }

    next();
  };
}
```

- [ ] Add to `backend/src/middleware/index.ts`:

```ts
export { requireFeature } from './entitlement';
```

- [ ] In `nursery-dashboard.controller.ts`, add the entitlements import at the
      top of the file:

```ts
import {
  features,
  allowance,
  canAddNursery,
  planLabel,
  isGroup,
  normaliseTier,
} from '../utils/entitlements';
```

- [ ] In `createNursery`, insert the allowance check between the `!name`
      validation and the `parentGroup` lookup (after line 98):

```ts
    // The allowance is what was paid for. A Single account has
    // paidNurseryCount 1, so this same check covers "Standard cannot add a
    // second nursery" — there is no separate Single/Group branch.
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, paidNurseryCount: true },
    });

    if (!account) {
      throw new UnauthorizedError('User not authenticated');
    }

    const used = await prisma.nursery.count({ where: { ownerId: userId } });

    if (!canAddNursery(account, used)) {
      const limits = allowance(account, used);
      return res.status(403).json({
        success: false,
        code: 'NURSERY_LIMIT_REACHED',
        paid: limits.paid,
        used: limits.used,
        message:
          limits.paid === 0
            ? 'Complete your payment to add a nursery.'
            : `Your plan covers ${limits.paid} ${limits.paid === 1 ? 'nursery' : 'nurseries'}. Add more to your plan to continue.`,
      });
    }
```

- [ ] In `createNursery` and `updateNursery`, drop `videoUrl` when the tier does
      not include video. Immediately before each `prisma.nursery.create` /
      `prisma.nursery.update` data object, add:

```ts
    const canUseVideo = features(account).video;
```

and in the data object replace `videoUrl,` with:

```ts
      videoUrl: canUseVideo ? videoUrl : null,
```

In `updateNursery` the `account` lookup does not exist yet — add the same
`prisma.user.findUnique({ where: { id: userId }, select: { planTier: true, paidNurseryCount: true } })`
there. Silently dropping rather than 403-ing is deliberate: a Platinum account
that downgrades still has a `videoUrl` on file, and a later profile edit must
not become unsaveable.

- [ ] Add `getMyEntitlements` to `nursery-dashboard.controller.ts`:

```ts
/**
 * GET /api/nursery-dashboard/entitlements
 *
 * The dashboard's source of truth for what to show. It replaces reading the
 * plan out of localStorage — which is trivially editable — with a value the
 * server derives from the same functions the gates use.
 */
export const getMyEntitlements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, paidNurseryCount: true },
    });

    if (!account) {
      throw new UnauthorizedError('User not authenticated');
    }

    const used = await prisma.nursery.count({ where: { ownerId: userId } });

    res.json({
      success: true,
      data: {
        planTier: normaliseTier(account.planTier),
        paidNurseryCount: account.paidNurseryCount,
        planLabel: planLabel(account),
        isGroup: isGroup(account),
        features: features(account),
        allowance: allowance(account, used),
      },
    });
  } catch (error) {
    next(error);
  }
};
```

- [ ] In `backend/src/routes/nursery-dashboard.routes.ts`, import
      `getMyEntitlements` and add the route beside `/my-group`:

```ts
// What this account is allowed to do — the dashboard reads this, not localStorage
router.get('/entitlements', getMyEntitlements);
```

- [ ] In `backend/src/routes/job.routes.ts`, import `requireFeature` from
      `../middleware` and add it to all six nursery-owner routes:

```ts
router.get('/nursery/my-jobs', authenticate, authorize('NURSERY_OWNER'), requireFeature('jobs'), nurseryGetMyJobs);
router.post('/nursery', authenticate, authorize('NURSERY_OWNER'), requireFeature('jobs'), nurseryCreateJob);
router.put('/nursery/:id', authenticate, authorize('NURSERY_OWNER'), requireFeature('jobs'), nurseryUpdateJob);
router.delete('/nursery/:id', authenticate, authorize('NURSERY_OWNER'), requireFeature('jobs'), nurseryDeleteJob);

router.get('/nursery/applications', authenticate, authorize('NURSERY_OWNER'), requireFeature('jobs'), nurseryGetMyApplications);
router.put('/nursery/applications/:id/status', authenticate, authorize('NURSERY_OWNER'), requireFeature('jobs'), nurseryUpdateApplicationStatus);
```

- [ ] In `backend/src/routes/team-member.routes.ts`, gate the three writes.
      `GET` stays open so a downgraded account can still see who is on file:

```ts
import { authenticate, requireFeature } from '../middleware';

router.get('/', authenticate, getTeamMembers);
router.post('/', authenticate, requireFeature('teamMembers'), addTeamMember);
router.put('/:memberId', authenticate, requireFeature('teamMembers'), updateTeamMember);
router.delete('/:memberId', authenticate, requireFeature('teamMembers'), deleteTeamMember);
```

- [ ] In `backend/src/routes/review.routes.ts`, gate owner moderation.
      `requireFeature` lets ADMIN through, so admin moderation is unaffected:

```ts
import { authenticate, authorize, optionalAuthenticate, requireFeature } from '../middleware';

router.put('/:id/approve', authenticate, authorize('ADMIN', 'NURSERY_OWNER'), requireFeature('reviewModeration'), approveReview);
router.put('/:id/unapprove', authenticate, authorize('ADMIN', 'NURSERY_OWNER'), requireFeature('reviewModeration'), unapproveReview);
router.put('/:id/reject', authenticate, authorize('ADMIN', 'NURSERY_OWNER'), requireFeature('reviewModeration'), rejectReview);
```

- [ ] In `auth.controller.ts` `nurserySignup` (around line 305), an unpaid signup
      gets no allowance. Replace `plan: 'free',` with:

```ts
          planTier: 'standard',
          paidNurseryCount: 0,
```

and in the `select` block replace `plan: true,` with:

```ts
          planTier: true,
          paidNurseryCount: true,
```

Zero, not one: this account has not paid, and under the block-over-limit rule it
must not be able to create a nursery until `reconcileAccount` runs. The old
`plan: 'free'` sentinel disappears with it.

- [ ] In `auth.controller.ts` `nurserySignin` (around line 442), replace
      `plan: user.plan || 'free',` with:

```ts
        planTier: user.planTier,
        paidNurseryCount: user.paidNurseryCount,
```

- [ ] Run `cd backend && npx tsc --noEmit`. Expect only `admin.controller.ts` to
      still fail.
- [ ] Run `cd backend && npm test`. Expect both unit test files still green.
- [ ] Commit: `feat(entitlements): enforce nursery allowance and platinum features server-side`

---

## Task 6: Admin surface

Admin currently sees a plan word and nothing about entitlement, so an
over-allowance account is invisible.

**Files:**
- `backend/src/controllers/admin.controller.ts` — modify
- `frontend/lib/api/admin.ts` — modify
- `frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx` — modify

**Interfaces:**

Produces (`GET /api/admin/subscriptions` item shape):
```ts
interface AdminSubscription {
  id: string;
  ownerName: string;
  email: string;
  nurseryName: string | null;
  planTier: 'standard' | 'platinum';
  paidNurseryCount: number;
  planLabel: string;          // "Single Standard" | "Single Platinum" | "Group of 8"
  isGroup: boolean;
  nurseriesUsed: number;
  overAllowance: boolean;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  groups: Array<{ id: string; name: string }>;
  nurseries: Array<{ id: string; name: string }>;
}
```

The `plan` field is removed, not kept alongside — two fields meaning the same
thing is how two screens drift apart.

Consumes: `planLabel`, `isGroup`, `normaliseTier`, `allowance` from
`../utils/entitlements`.

**Steps:**

- [ ] In `admin.controller.ts`, add the import:

```ts
import { planLabel, isGroup, normaliseTier, allowance } from '../utils/entitlements';
```

- [ ] In `getSubscriptions`, replace `plan: true,` in the `select` (line 497)
      with:

```ts
        planTier: true,
        paidNurseryCount: true,
```

- [ ] In `getSubscriptions`, replace the `.map` (lines 513–527):

```ts
    const subscriptions = owners.map((owner) => {
      const limits = allowance(owner, owner.nurseries.length);
      return {
        id: owner.id,
        ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
        email: owner.email,
        nurseryName: owner.nurseryName,
        planTier: normaliseTier(owner.planTier),
        paidNurseryCount: limits.paid,
        planLabel: planLabel(owner),
        isGroup: isGroup(owner),
        nurseriesUsed: limits.used,
        overAllowance: limits.used > limits.paid,
        status: owner.isActive
          ? 'active'
          : owner.isVerified
            ? 'suspended'
            : 'pending',
        createdAt: owner.createdAt,
        groups: owner.groups,
        nurseries: owner.nurseries,
      };
    });
```

- [ ] Run `cd backend && npx tsc --noEmit`. Expect **zero** errors. If any
      remain, a `plan` reference was missed — find it before continuing.
- [ ] Run `cd backend && npm test`. Expect green.
- [ ] In `frontend/lib/api/admin.ts`, update `AdminSubscription` to the shape
      above (drop `plan`, add `planTier`, `paidNurseryCount`, `planLabel`,
      `isGroup`, `nurseriesUsed`, `overAllowance`). Leave `AdminCoupon.plans`
      and `AdminPaymentRecord.plan` alone — those are Stripe product keys, not
      account tiers.
- [ ] In `subscriptions.tsx`, delete the `PLAN_LABELS` constant (line 36) and
      every use of it. The label now arrives from the server via `planLabel`, so
      the frontend cannot invent a different word for the same plan.
- [ ] In `subscriptions.tsx`, change the Plan column to render `sub.planLabel`,
      and add a Nurseries column showing `used / paid`, highlighted when over:

```tsx
<td className="px-4 py-3 whitespace-nowrap">
  <span
    className={sub.overAllowance ? 'text-red-600 font-semibold' : 'text-gray-700'}
    title={sub.overAllowance ? 'This account has more nurseries than it paid for' : undefined}
  >
    {sub.nurseriesUsed} / {sub.paidNurseryCount}
  </span>
</td>
```

Add the matching `<th>` labelled `Used / Paid` to the header row.
- [ ] In `subscriptions.tsx`, update the Plans tab cards to the three products:
      `Single Standard — GBP 23.95/month`, `Single Platinum — GBP 38.60/month`,
      `Group — from GBP 34.74/nursery/month (2+ nurseries)`.
- [ ] Any plan filter or dropdown in this component that offered "Single" and
      "Group" as the two options becomes three: Single Standard, Single
      Platinum, Group. Filter on `planTier` + `isGroup`, not on the label string.
- [ ] Run `cd frontend && npx tsc --noEmit`. Expect zero errors.
- [ ] Commit: `feat(admin): show plan label and nursery used/paid per account`

---

## Task 7: Frontend pricing mirror + parity test

The display mirror still models two plans. It gets the third, plus a test that
fails if the two band tables ever drift.

**Files:**
- `frontend/lib/pricing.ts` — rewrite
- `backend/src/utils/pricing-parity.test.ts` — create
- `frontend/components/landing-page/pricing.tsx` — modify

**Interfaces:**

Produces:
```ts
export type PlanTier = 'standard' | 'platinum';
export const SINGLE_STANDARD_MONTHLY_PENCE = 2395;
export const SINGLE_PLATINUM_MONTHLY_PENCE = 3860;
export function priceFor(tier: PlanTier, billing: BillingPeriod, nurseryCount: number): DisplayQuote;
export function planLabel(tier: PlanTier, nurseryCount: number): string;
```

`PLAN_LABEL` is deleted — a static `Record<PlanKey, string>` cannot express
"Group of 8", and it was the thing asserting platinum means group.

**Steps:**

- [ ] Write `backend/src/utils/pricing-parity.test.ts`. It lives in the backend
      so there is one test harness, and reads the frontend file as text so it
      cannot be satisfied by a stale copy:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
} from './pricing';

// process.cwd(), not __dirname — vitest transforms to ESM, where __dirname
// does not exist regardless of what tsconfig says. Vitest runs from backend/.
const source = readFileSync(
  join(process.cwd(), '../frontend/lib/pricing.ts'),
  'utf8'
);

const constant = (name: string): number => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  expect(match, `${name} not found in frontend/lib/pricing.ts`).not.toBeNull();
  return Number(match![1]);
};

describe('frontend pricing mirror', () => {
  it('has the same single rates', () => {
    expect(constant('SINGLE_STANDARD_MONTHLY_PENCE')).toBe(SINGLE_STANDARD_MONTHLY_PENCE);
    expect(constant('SINGLE_PLATINUM_MONTHLY_PENCE')).toBe(SINGLE_PLATINUM_MONTHLY_PENCE);
  });

  it('has the same group bands', () => {
    const re =
      /\{\s*min:\s*(\d+),\s*max:\s*(\d+),\s*unitPence:\s*(\d+),\s*discountPercent:\s*(\d+)\s*\}/g;
    const found = [...source.matchAll(re)].map((m) => ({
      min: Number(m[1]),
      max: Number(m[2]),
      unitPence: Number(m[3]),
      discountPercent: Number(m[4]),
    }));

    expect(found).toEqual(GROUP_BANDS.map((b) => ({ ...b })));
  });
});
```

- [ ] Run `cd backend && npm test`. Expect the parity test to fail — the
      frontend has `SINGLE_MONTHLY_PENCE`, not the two named constants.
- [ ] Rewrite `frontend/lib/pricing.ts`:

```ts
/**
 * Display-side mirror of backend/src/utils/pricing.ts.
 *
 * This exists so the page can show a running total as someone drags the
 * nursery count around, without a round trip per keystroke. It is NOT what
 * gets charged — the server re-derives the price from the nursery count on
 * every checkout, and ignores anything the client says about money.
 *
 * backend/src/utils/pricing-parity.test.ts fails if this file drifts.
 */

export type PlanTier = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

export const SINGLE_STANDARD_MONTHLY_PENCE = 2395;
export const SINGLE_PLATINUM_MONTHLY_PENCE = 3860;
export const BESPOKE_THRESHOLD = 61;
export const MIN_GROUP_SIZE = 2;
/** Largest group that can check out without talking to a human. */
export const MAX_SELF_SERVE_GROUP = BESPOKE_THRESHOLD - 1;

export interface GroupBand {
  min: number;
  max: number;
  unitPence: number;
  discountPercent: number;
}

export const GROUP_BANDS: readonly GroupBand[] = [
  { min: 2, max: 5, unitPence: 3474, discountPercent: 10 },
  { min: 6, max: 15, unitPence: 3088, discountPercent: 20 },
  { min: 16, max: 30, unitPence: 2702, discountPercent: 30 },
  { min: 31, max: 60, unitPence: 2316, discountPercent: 40 },
];

export const findGroupBand = (count: number): GroupBand | undefined =>
  GROUP_BANDS.find((b) => count >= b.min && count <= b.max);

export const isBespoke = (count: number) => count >= BESPOKE_THRESHOLD;

export const formatGbp = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Mirrors entitlements.planLabel() on the server. */
export const planLabel = (tier: PlanTier, nurseryCount: number): string => {
  if (nurseryCount >= MIN_GROUP_SIZE) return `Group of ${nurseryCount}`;
  return tier === 'platinum' ? 'Single Platinum' : 'Single Standard';
};

export interface DisplayQuote {
  /** Per nursery, per billing period. */
  unitPence: number;
  totalPence: number;
  discountPercent: number;
  /** True when the group is too large to self-serve. */
  bespoke: boolean;
  isGroup: boolean;
}

export function priceFor(
  tier: PlanTier,
  billing: BillingPeriod,
  nurseryCount: number
): DisplayQuote {
  const months = billing === 'annual' ? 12 : 1;
  const isGroup = nurseryCount >= MIN_GROUP_SIZE;

  if (!isGroup) {
    const unitPence =
      (tier === 'platinum' ? SINGLE_PLATINUM_MONTHLY_PENCE : SINGLE_STANDARD_MONTHLY_PENCE) *
      months;
    return { unitPence, totalPence: unitPence, discountPercent: 0, bespoke: false, isGroup: false };
  }

  if (isBespoke(nurseryCount)) {
    return { unitPence: 0, totalPence: 0, discountPercent: 0, bespoke: true, isGroup: true };
  }

  const band = findGroupBand(nurseryCount);
  if (!band) {
    return { unitPence: 0, totalPence: 0, discountPercent: 0, bespoke: false, isGroup: true };
  }

  const unitPence = band.unitPence * months;
  return {
    unitPence,
    totalPence: unitPence * nurseryCount,
    discountPercent: band.discountPercent,
    bespoke: false,
    isGroup: true,
  };
}
```

`bespoke` now returns `discountPercent: 0` rather than the old hardcoded `50`,
which was an invented number for a price nobody has quoted yet.

- [ ] Run `cd backend && npm test`. Expect all three test files green.
- [ ] In `frontend/components/landing-page/pricing.tsx`, restructure
      `pricingPlans` into three cards:
      - **Single Standard** — £23.95/nursery/month, 1 nursery, no count picker
      - **Single Platinum** — £38.60/nursery/month, 1 nursery, no count picker
      - **Group** — from £34.74/nursery/month, count picker starting at 2, all
        Platinum features plus the volume discount
- [ ] In `pricing.tsx`, replace the platinum `features[0]` string
      `"Unlimited Nursery Locations"` with
      `"Volume discount — up to 40% off per nursery"`. It is not true, and it is
      the claim the allowance check now contradicts.
- [ ] In `pricing.tsx`, update the comparison table: the "Nursery Locations" row
      reads `1` / `1` / `2–60` across the three columns.
- [ ] In `pricing.tsx`, ensure the Group card's count picker is clamped to
      `MIN_GROUP_SIZE..MAX_SELF_SERVE_GROUP` and that `isBespoke` still routes to
      `/contact-us`.
- [ ] `handlePlanSelect` must post `nurseryCount: 1` for both Single cards and
      the picked count for Group.
- [ ] Run `cd frontend && npx tsc --noEmit`. Expect zero errors.
- [ ] Commit: `feat(pricing): mirror the three products on the pricing page, with a parity test`

---

## Task 8: Dashboard wiring and naming

The last of the `localStorage` trust, the 61+ upgrade crash, and the wording
that still says platinum means group.

**Files:**
- `frontend/hooks/use-nursery-plan.ts` — rewrite
- `frontend/lib/api/auth.ts` — modify
- `frontend/app/nursery-dashboard/upgrade/page.tsx` — modify
- `frontend/components/nursery-dashboard-panel/sidebar.tsx` — modify

**Interfaces:**

Produces:
```ts
export interface Entitlements {
  planTier: 'standard' | 'platinum';
  paidNurseryCount: number;
  planLabel: string;
  isGroup: boolean;
  features: {
    jobs: boolean; video: boolean; teamMembers: boolean;
    reviewModeration: boolean; priorityPlacement: boolean; analytics: boolean;
  };
  allowance: { paid: number; used: number; remaining: number };
}
export function useEntitlements(): { data: Entitlements | null; loading: boolean };
```

Consumes: `GET /api/nursery-dashboard/entitlements` from Task 5.

**Steps:**

- [ ] Rewrite `frontend/hooks/use-nursery-plan.ts` to fetch from the endpoint
      instead of reading `localStorage`. Keep the file name so imports do not
      churn; export `useEntitlements`, and keep a thin `useNurseryPlan()` that
      returns `data?.planTier ?? 'standard'` for existing call sites.
      Return `loading` so consumers render a neutral state rather than briefly
      flashing the locked UI to a Platinum owner.
- [ ] Delete `maxNurseries` and its `Infinity`. Consumers read
      `allowance.remaining > 0` instead. `Infinity` was the model of "unlimited
      locations" that no longer exists.
- [ ] In `frontend/lib/api/auth.ts`, replace `plan?: string` on `User` with
      `planTier?: 'standard' | 'platinum'` and `paidNurseryCount?: number`.
      Update the `verifyUpgradeSession` handler that writes into
      `localStorage['nurseryUser']` / `localStorage['user']` to write both
      fields. This is a display hint only now — nothing gates on it.
- [ ] In `frontend/app/nursery-dashboard/upgrade/page.tsx`, add the missing
      bespoke guard at the top of `handleUpgrade`. Today the button says
      "Contact us for a quote" at 61+ but `handleUpgrade` POSTs anyway and the
      server 400s:

```ts
    if (upgradeQuote.bespoke) {
      router.push('/contact-us');
      return;
    }
```

- [ ] In the same file, replace the hardcoded
      `https://mathew-production.up.railway.app/api/stripe/create-upgrade-session`
      with the shared API base URL used elsewhere in `frontend/lib/api/`. A
      hardcoded production host in a dashboard page means the upgrade flow
      cannot be tested locally.
- [ ] In the same file, replace `PLATINUM_FEATURES[0]`
      `"Unlimited Nursery Locations"` with the volume-discount line, matching
      Task 7.
- [ ] In the same file, surface the allowance: show
      `{used} of {paid} nurseries used` from `useEntitlements()`, and offer both
      upgrade axes — change tier at the current count, and increase the count.
- [ ] In `frontend/components/nursery-dashboard-panel/sidebar.tsx`, drive every
      string from `planLabel` rather than `isPlatinum`:
      - line 81 badge: keep "Platinum" — it names the *tier*, which is correct
      - line 128 `"You're on Standard"` becomes `You're on {planLabel}`
      - line 138 `"Upgrade to Platinum"` stays for a standard account
      - gate the Jobs section on `features.jobs`, not `plan === 'platinum'`
- [ ] In the nursery list view, disable "Add nursery" when
      `allowance.remaining === 0` and show
      `{paid} of {paid} nurseries used — add more to your plan`, linking to
      `/nursery-dashboard/upgrade`. The 403 from Task 5 is the real gate; this
      only avoids a pointless round trip.
- [ ] Run `cd frontend && npx tsc --noEmit`. Expect zero errors.
- [ ] Run `cd frontend && npm run build`. Expect a clean build.
- [ ] Commit: `feat(dashboard): read entitlements from the server and name all three plans`

---

## Verification

After Task 8, all of the following must hold:

- [ ] `cd backend && npm test` — three files, all green.
- [ ] `cd backend && npx tsc --noEmit` — zero errors.
- [ ] `cd frontend && npm run build` — clean.
- [ ] Searching `backend/src` for `.plan` returns only Stripe product-key uses
      (`coupon.controller.ts`, `payment-history.controller.ts`,
      `utils/stripe.ts`), never a `User.plan` read.
- [ ] Searching `frontend/hooks` and `frontend/app/nursery-dashboard` for
      `Infinity` returns nothing.
- [ ] Searching `frontend` for `Unlimited Nursery` returns nothing.

Manual, against Stripe test mode:

- [ ] Buy Single Platinum at count 1. Charge is £38.60; account lands as
      `planTier: platinum, paidNurseryCount: 1`.
- [ ] Buy Group at count 8. Charge is £247.04; account lands as
      `planTier: platinum, paidNurseryCount: 8`.
- [ ] As a Single Standard owner, `POST /api/nursery-dashboard/create` a second
      nursery. Expect 403 `NURSERY_LIMIT_REACHED`.
- [ ] As a Single Standard owner, `POST /api/jobs/nursery`. Expect 403
      `FEATURE_NOT_IN_PLAN` — and confirm that editing `localStorage.nurseryUser`
      to `planTier: platinum` does not change that.
- [ ] Apply an existing promotion code at checkout. It must still apply — this
      is the check that Global Constraint 5 held.

## Known issues carried forward

**Band boundaries are non-monotonic.** 15 nurseries costs £463.20 while 16 costs
£432.32, and the same happens at all four boundaries. This is the supplied
pricing table, not a code bug, so it is implemented as given. Raise with Matt;
the usual fix is marginal banding, where each band's rate applies only to the
nurseries falling within it.

**`mode: 'payment'` is a one-time charge**, despite the "recurring / 90 days
notice" wording shown at checkout. Being handled separately in Stripe. When
subscriptions land, `createUpgradeSession` is the one function that changes — a
quantity update on the existing subscription instead of a fresh checkout.
