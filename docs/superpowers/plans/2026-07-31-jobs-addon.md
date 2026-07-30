# Jobs Add-on Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Single Standard nursery owners buy a £5.99/mo jobs add-on that unlocks job posting capped at one live advert, without touching the plan billing path.

**Architecture:** A separate Stripe subscription tracked in five new `User` columns (`jobsAddon*`), with its own sync module parallel to `subscription-sync.ts`. The webhook branches on `metadata.mathew_purpose` before the plan path ever runs. Entitlements gains `hasJobsAddon` and `activeJobLimit`; `PUBLIC_JOB_WHERE` gains a nested OR. The one-active-job cap is enforced server-side with a `FOR UPDATE` lock.

**Tech Stack:** Prisma (Postgres), Express, Stripe Node SDK, Vitest, Next.js (React), Tailwind CSS

## Global Constraints

- Prices in pence (599 for £5.99). Never floating point.
- `JOBS_ADDON_MINIMUM_MONTHS = 3`. Lock-in is 3 calendar months from the subscription's `created` timestamp on Stripe.
- `JOBS_ADDON_ACTIVE_LIMIT = 1`. One live advert at a time for add-on holders; `null` means unlimited (Platinum).
- Monthly only — no annual add-on.
- The add-on lookup key format is `mathew_jobs_addon_monthly_v1`. It must NOT match `LOOKUP_KEY_RE` (`/^mathew_(standard|platinum)_(monthly|annual)_v(\d+)$/`).
- `readSubscription()` and `reconcileFromSubscription()` must never be called with an add-on subscription ID. The webhook branch is what prevents this.
- Prisma migration via `prisma migrate deploy`, never `db push`.
- Vitest for all tests. TDD: write the failing test first.
- Frontend pricing constants must stay in sync — `pricing-parity.test.ts` enforces this.

---

### Task 1: Pricing constants and lookup-key functions

**Files:**
- Modify: `backend/src/utils/pricing.ts` (append after line 216)
- Modify: `frontend/lib/pricing.ts` (append after line 95)
- Modify: `backend/src/utils/pricing.test.ts` (append after line 108)
- Modify: `backend/src/utils/pricing-parity.test.ts` (append after line 41)

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `JOBS_ADDON_MONTHLY_PENCE: 599` — used by Task 5 (Stripe price), Task 9 (frontend)
  - `JOBS_ADDON_MINIMUM_MONTHS: 3` — used by Task 5 (checkout), Task 9 (frontend)
  - `JOBS_ADDON_ACTIVE_LIMIT: 1` — used by Task 3 (entitlements), Task 7 (job controller)
  - `JOBS_ADDON_PRICE_VERSION: 1` — used by Task 5 (Stripe price)
  - `jobsAddonLookupKey(): string` — returns `"mathew_jobs_addon_monthly_v1"`
  - `parseJobsAddonLookupKey(key: string | null | undefined): { version: number } | null`

- [ ] **Step 1: Write failing tests in `backend/src/utils/pricing.test.ts`**

Append to the end of the file:

```ts
describe('jobs add-on pricing', () => {
  it('exports the add-on rate', () => {
    expect(JOBS_ADDON_MONTHLY_PENCE).toBe(599);
  });

  it('exports the minimum term', () => {
    expect(JOBS_ADDON_MINIMUM_MONTHS).toBe(3);
  });

  it('exports the active job limit', () => {
    expect(JOBS_ADDON_ACTIVE_LIMIT).toBe(1);
  });

  it('round-trips the add-on lookup key', () => {
    const key = jobsAddonLookupKey();
    expect(key).toBe('mathew_jobs_addon_monthly_v1');
    const parsed = parseJobsAddonLookupKey(key);
    expect(parsed).toEqual({ version: 1 });
  });

  it('rejects plan keys from parseJobsAddonLookupKey', () => {
    expect(parseJobsAddonLookupKey('mathew_standard_monthly_v1')).toBeNull();
    expect(parseJobsAddonLookupKey('mathew_platinum_annual_v1')).toBeNull();
  });

  it('rejects the add-on key from parseLookupKey (plan reader)', () => {
    expect(parseLookupKey('mathew_jobs_addon_monthly_v1')).toBeNull();
  });

  it('rejects null and garbage from parseJobsAddonLookupKey', () => {
    expect(parseJobsAddonLookupKey(null)).toBeNull();
    expect(parseJobsAddonLookupKey(undefined)).toBeNull();
    expect(parseJobsAddonLookupKey('')).toBeNull();
    expect(parseJobsAddonLookupKey('some_random_key')).toBeNull();
  });
});
```

Update the import at the top of `pricing.test.ts` to add the new symbols:

```ts
import {
  quote,
  findGroupBand,
  PricingError,
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
  JOBS_ADDON_MONTHLY_PENCE,
  JOBS_ADDON_MINIMUM_MONTHS,
  JOBS_ADDON_ACTIVE_LIMIT,
  jobsAddonLookupKey,
  parseJobsAddonLookupKey,
  parseLookupKey,
  type PlanTier,
} from './pricing';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/utils/pricing.test.ts`
Expected: FAIL — `JOBS_ADDON_MONTHLY_PENCE` is not exported

- [ ] **Step 3: Implement in `backend/src/utils/pricing.ts`**

Append after line 215 (before the final blank line):

```ts
// ── Jobs add-on ──────────────────────────────────────────────────────────────

/** £5.99/mo, monthly only. */
export const JOBS_ADDON_MONTHLY_PENCE = 599;

/** First three payments are locked in. */
export const JOBS_ADDON_MINIMUM_MONTHS = 3;

/** One live advert at a time on the add-on. Platinum is unlimited. */
export const JOBS_ADDON_ACTIVE_LIMIT = 1;

/** Versioned independently of plan prices. */
export const JOBS_ADDON_PRICE_VERSION = 1;

const ADDON_KEY_RE = /^mathew_jobs_addon_monthly_v(\d+)$/;

export function jobsAddonLookupKey(): string {
  return `mathew_jobs_addon_monthly_v${JOBS_ADDON_PRICE_VERSION}`;
}

export function parseJobsAddonLookupKey(
  key: string | null | undefined
): { version: number } | null {
  const match = ADDON_KEY_RE.exec(key ?? '');
  if (!match) return null;
  return { version: Number(match[1]) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/utils/pricing.test.ts`
Expected: all PASS

- [ ] **Step 5: Add parity tests in `backend/src/utils/pricing-parity.test.ts`**

Add a new describe block after the existing one (append before end of file):

```ts
describe('frontend jobs add-on mirror', () => {
  it('has the same add-on rate', () => {
    expect(constant('JOBS_ADDON_MONTHLY_PENCE')).toBe(JOBS_ADDON_MONTHLY_PENCE);
  });

  it('has the same minimum term', () => {
    expect(constant('JOBS_ADDON_MINIMUM_MONTHS')).toBe(JOBS_ADDON_MINIMUM_MONTHS);
  });
});
```

Update the import to add the new constants:

```ts
import {
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
  JOBS_ADDON_MONTHLY_PENCE,
  JOBS_ADDON_MINIMUM_MONTHS,
} from './pricing';
```

- [ ] **Step 6: Run parity test — expect FAIL (frontend not yet updated)**

Run: `cd backend && npx vitest run src/utils/pricing-parity.test.ts`
Expected: FAIL — `JOBS_ADDON_MONTHLY_PENCE not found in frontend/lib/pricing.ts`

- [ ] **Step 7: Add frontend mirror constants in `frontend/lib/pricing.ts`**

Append after `export const MIN_GROUP_SIZE = 2;` (after line 18):

```ts
export const JOBS_ADDON_MONTHLY_PENCE = 599;
export const JOBS_ADDON_MINIMUM_MONTHS = 3;
```

- [ ] **Step 8: Run parity test to verify it passes**

Run: `cd backend && npx vitest run src/utils/pricing-parity.test.ts`
Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/utils/pricing.ts backend/src/utils/pricing.test.ts \
       backend/src/utils/pricing-parity.test.ts frontend/lib/pricing.ts
git commit -m "feat(pricing): add jobs add-on constants and lookup-key functions"
```

---

### Task 2: Prisma migration — five new User columns

**Files:**
- Modify: `backend/prisma/schema.prisma` (User model, lines 10-57)
- Create: migration file via `prisma migrate dev`

**Interfaces:**
- Consumes: nothing
- Produces: five new columns on `User` available to all subsequent tasks:
  - `jobsAddonSubscriptionId: String? @unique`
  - `jobsAddonStatus: String @default("none")`
  - `jobsAddonCurrentPeriodEnd: DateTime?`
  - `jobsAddonCancelAt: DateTime?`
  - `jobsAddonMinimumTermEnd: DateTime?`

- [ ] **Step 1: Edit the User model in `backend/prisma/schema.prisma`**

Insert after line 53 (`cancelAt DateTime?`) and before line 54 (`jobs Job[]`):

```prisma
  /// ── Jobs add-on ──────────────────────────────────────────────────────────
  /// Separate Stripe subscription for the £5.99/mo job-posting add-on.
  /// Same mirror pattern as the plan columns above.
  jobsAddonSubscriptionId   String?   @unique
  jobsAddonStatus           String    @default("none")
  jobsAddonCurrentPeriodEnd DateTime?
  jobsAddonCancelAt         DateTime?
  jobsAddonMinimumTermEnd   DateTime?
```

Add a second index. Change the existing `@@index` line (line 55) to include both:

```prisma
  @@index([subscriptionStatus])
  @@index([jobsAddonStatus])
```

- [ ] **Step 2: Generate the migration**

Run: `cd backend && npx prisma migrate dev --name add-jobs-addon-columns`
Expected: migration created and applied to dev database

- [ ] **Step 3: Verify the migration SQL**

Run: `cat backend/prisma/migrations/*add-jobs-addon-columns*/migration.sql`
Expected: ALTER TABLE with five ADD COLUMN statements and a CREATE UNIQUE INDEX + CREATE INDEX

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(schema): add jobs add-on columns to User"
```

---

### Task 3: Entitlements — `hasJobsAddon`, `activeJobLimit`, updated `features()`

**Files:**
- Modify: `backend/src/utils/entitlements.ts` (lines 1-116)
- Modify: `backend/src/utils/entitlements.test.ts` (lines 1-165)

**Interfaces:**
- Consumes: `JOBS_ADDON_ACTIVE_LIMIT` from Task 1
- Produces:
  - `JobsAddonAccount` interface: `{ jobsAddonStatus: string | null }`
  - `hasJobsAddon(a: JobsAddonAccount): boolean` — used by Tasks 4, 5, 6, 8
  - `activeJobLimit(a: PlanAccount & JobsAddonAccount): number | null` — used by Tasks 7, 8
  - Updated `features(a: PlanAccount & Partial<JobsAddonAccount>)` — `jobs` now true when add-on is live

- [ ] **Step 1: Write failing tests in `backend/src/utils/entitlements.test.ts`**

Add to the imports:

```ts
import {
  allowance,
  canAddNursery,
  features,
  hasJobsAddon,
  activeJobLimit,
  isGroup,
  isLive,
  normaliseTier,
  paidCount,
  planLabel,
} from './entitlements';
```

Append new describe blocks:

```ts
describe('hasJobsAddon', () => {
  it('is true for the same live statuses as the main plan', () => {
    expect(hasJobsAddon({ jobsAddonStatus: 'active' })).toBe(true);
    expect(hasJobsAddon({ jobsAddonStatus: 'trialing' })).toBe(true);
    expect(hasJobsAddon({ jobsAddonStatus: 'past_due' })).toBe(true);
  });

  it('is false for non-live statuses', () => {
    for (const status of ['canceled', 'none', 'incomplete', null, '']) {
      expect(hasJobsAddon({ jobsAddonStatus: status }), `status: ${status}`).toBe(false);
    }
  });
});

describe('features with jobs add-on', () => {
  it('unlocks jobs on standard when add-on is live', () => {
    const f = features({ planTier: 'standard', paidNurseryCount: 1, jobsAddonStatus: 'active' });
    expect(f.jobs).toBe(true);
  });

  it('does NOT unlock video, teamMembers, reviewModeration, priorityPlacement or analytics via add-on', () => {
    const f = features({ planTier: 'standard', paidNurseryCount: 1, jobsAddonStatus: 'active' });
    expect(f.video).toBe(false);
    expect(f.teamMembers).toBe(false);
    expect(f.reviewModeration).toBe(false);
    expect(f.priorityPlacement).toBe(false);
    expect(f.analytics).toBe(false);
  });

  it('still unlocks jobs on platinum even without add-on', () => {
    const f = features({ planTier: 'platinum', paidNurseryCount: 1 });
    expect(f.jobs).toBe(true);
  });

  it('locks jobs on standard without add-on', () => {
    const f = features({ planTier: 'standard', paidNurseryCount: 1 });
    expect(f.jobs).toBe(false);
  });

  it('locks jobs when add-on is canceled', () => {
    const f = features({ planTier: 'standard', paidNurseryCount: 1, jobsAddonStatus: 'canceled' });
    expect(f.jobs).toBe(false);
  });
});

describe('activeJobLimit', () => {
  it('returns null (unlimited) for platinum', () => {
    expect(activeJobLimit({ planTier: 'platinum', paidNurseryCount: 1, jobsAddonStatus: 'none' })).toBeNull();
  });

  it('returns 1 for standard with live add-on', () => {
    expect(activeJobLimit({ planTier: 'standard', paidNurseryCount: 1, jobsAddonStatus: 'active' })).toBe(1);
  });

  it('returns 0 for standard without add-on', () => {
    expect(activeJobLimit({ planTier: 'standard', paidNurseryCount: 1, jobsAddonStatus: 'none' })).toBe(0);
  });

  it('returns 0 for standard with canceled add-on', () => {
    expect(activeJobLimit({ planTier: 'standard', paidNurseryCount: 1, jobsAddonStatus: 'canceled' })).toBe(0);
  });

  it('returns null for platinum even with a live add-on (edge case — should not happen)', () => {
    expect(activeJobLimit({ planTier: 'platinum', paidNurseryCount: 1, jobsAddonStatus: 'active' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/utils/entitlements.test.ts`
Expected: FAIL — `hasJobsAddon` is not exported

- [ ] **Step 3: Implement in `backend/src/utils/entitlements.ts`**

Add the import at the top (after line 15):

```ts
import { JOBS_ADDON_ACTIVE_LIMIT } from './pricing';
```

Add the interface after `BillingAccount` (after line 53):

```ts
export interface JobsAddonAccount {
  jobsAddonStatus: string | null;
}

export function hasJobsAddon(account: JobsAddonAccount): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    account.jobsAddonStatus ?? ''
  );
}
```

Change the `features` function signature and the `jobs` line (lines 85-95):

```ts
export function features(account: PlanAccount & Partial<JobsAddonAccount>): PlanFeatures {
  const unlocked = normaliseTier(account.planTier) === 'platinum';
  return {
    jobs: unlocked || hasJobsAddon({ jobsAddonStatus: account.jobsAddonStatus ?? null }),
    video: unlocked,
    teamMembers: unlocked,
    reviewModeration: unlocked,
    priorityPlacement: unlocked,
    analytics: unlocked,
  };
}
```

Add `activeJobLimit` after `canAddNursery` (after line 114):

```ts
/**
 * How many jobs may be active at once. null means unlimited.
 * Platinum is unlimited. Add-on is JOBS_ADDON_ACTIVE_LIMIT. Neither is 0.
 */
export function activeJobLimit(
  account: PlanAccount & JobsAddonAccount
): number | null {
  if (normaliseTier(account.planTier) === 'platinum') return null;
  if (hasJobsAddon(account)) return JOBS_ADDON_ACTIVE_LIMIT;
  return 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/utils/entitlements.test.ts`
Expected: all PASS

- [ ] **Step 5: Verify the existing features tests still pass (standard locks all, platinum unlocks all)**

Run: `cd backend && npx vitest run src/utils/entitlements.test.ts`
Expected: all PASS — including the existing `'locks everything on standard'` test, because without `jobsAddonStatus` in the object the `Partial<JobsAddonAccount>` defaults to `undefined`, which `hasJobsAddon` treats as not-live.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/entitlements.ts backend/src/utils/entitlements.test.ts
git commit -m "feat(entitlements): add hasJobsAddon, activeJobLimit, update features().jobs"
```

---

### Task 4: Public visibility — update `PUBLIC_JOB_WHERE`

**Files:**
- Modify: `backend/src/utils/public-visibility.ts` (lines 68-86)
- Modify: `backend/src/utils/public-visibility.test.ts` (lines 148-177)

**Interfaces:**
- Consumes: `LIVE_SUBSCRIPTION_STATUSES` from `entitlements.ts`
- Produces: updated `PUBLIC_JOB_WHERE` that admits add-on holders

- [ ] **Step 1: Write failing tests in `backend/src/utils/public-visibility.test.ts`**

Add to the `PUBLIC_JOB_WHERE` describe block (after the existing `'requires both a live subscription status AND platinum tier'` test, before line 177):

```ts
  it('admits a paying poster with a live add-on on standard tier', () => {
    const posterArm = PUBLIC_JOB_WHERE.OR[1] as {
      postedBy: { is: { OR: any[] } };
    };
    const payingClause = posterArm.postedBy.is.OR.find(
      (c: any) => c.subscriptionStatus !== undefined
    );
    // The paying arm now has a nested OR: platinum OR add-on live
    expect(payingClause!.OR).toBeDefined();
    const addonClause = payingClause!.OR.find(
      (c: any) => c.jobsAddonStatus !== undefined
    );
    expect(addonClause).toBeDefined();
    expect(addonClause!.jobsAddonStatus!.in).toEqual(['active', 'trialing', 'past_due']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/utils/public-visibility.test.ts`
Expected: FAIL — `payingClause.OR` is undefined

- [ ] **Step 3: Update `PUBLIC_JOB_WHERE` in `backend/src/utils/public-visibility.ts`**

Replace lines 68-86 with:

```ts
export const PUBLIC_JOB_WHERE = {
  isActive: true,
  OR: [
    { postedBy: { is: null } },
    {
      postedBy: {
        is: {
          OR: [
            { role: 'ADMIN' as const },
            {
              subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] },
              OR: [
                { planTier: 'platinum' },
                { jobsAddonStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
              ],
            },
          ],
        },
      },
    },
  ],
};
```

- [ ] **Step 4: Update the existing test that checks the paying clause**

The existing test at line 166 (`'requires both a live subscription status AND platinum tier'`) needs updating because the structure changed. Replace it:

```ts
  it('requires a live subscription AND (platinum OR live add-on) for a paying poster', () => {
    const posterArm = PUBLIC_JOB_WHERE.OR[1] as {
      postedBy: { is: { OR: any[] } };
    };
    const payingClause = posterArm.postedBy.is.OR.find(
      (c: any) => c.subscriptionStatus !== undefined
    );
    expect(payingClause).toBeDefined();
    expect(payingClause!.subscriptionStatus!.in).toEqual(['active', 'trialing', 'past_due']);
    // Must be platinum OR have a live add-on
    const platinumArm = payingClause!.OR.find((c: any) => c.planTier === 'platinum');
    expect(platinumArm).toBeDefined();
    const addonArm = payingClause!.OR.find((c: any) => c.jobsAddonStatus !== undefined);
    expect(addonArm).toBeDefined();
    expect(addonArm!.jobsAddonStatus!.in).toEqual(['active', 'trialing', 'past_due']);
  });
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `cd backend && npx vitest run src/utils/public-visibility.test.ts`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/public-visibility.ts backend/src/utils/public-visibility.test.ts
git commit -m "feat(visibility): PUBLIC_JOB_WHERE admits add-on holders"
```

---

### Task 5: Jobs add-on sync module and Stripe product setup

**Files:**
- Create: `backend/src/utils/jobs-addon-sync.ts`
- Create: `backend/src/utils/jobs-addon-sync.test.ts`
- Modify: `backend/src/utils/stripe.ts` (add `ensureJobsAddonProduct` and `ensureJobsAddonPrice`)

**Interfaces:**
- Consumes:
  - `parseJobsAddonLookupKey` from Task 1
  - `SubscriptionShapeError` from `subscription-sync.ts`
  - `getStripe` from `stripe.ts`
  - `JOBS_ADDON_MONTHLY_PENCE`, `JOBS_ADDON_MINIMUM_MONTHS`, `jobsAddonLookupKey` from Task 1
- Produces:
  - `JobsAddonSnapshot`: `{ jobsAddonStatus: string, jobsAddonCurrentPeriodEnd: Date | null, jobsAddonCancelAt: Date | null, jobsAddonSubscriptionId: string }`
  - `readJobsAddonSubscription(sub: Stripe.Subscription): JobsAddonSnapshot`
  - `reconcileJobsAddon(subscriptionId: string, userId: string): Promise<JobsAddonSnapshot>`
  - `clearJobsAddon(userId: string, status: string): Promise<void>`
  - `ensureJobsAddonProduct(): Promise<string>` (product ID)
  - `ensureJobsAddonPrice(): Promise<string>` (price ID)

- [ ] **Step 1: Write tests in `backend/src/utils/jobs-addon-sync.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readJobsAddonSubscription } from './jobs-addon-sync';
import { SubscriptionShapeError } from './subscription-sync';

const fakeItem = (lookupKey: string, quantity = 1) => ({
  price: { id: 'price_xxx', lookup_key: lookupKey },
  quantity,
  current_period_end: 1750000000,
});

const fakeSub = (items: any[], status = 'active') =>
  ({
    id: 'sub_addon_123',
    status,
    cancel_at: null,
    customer: 'cus_123',
    items: { data: items },
  }) as any;

describe('readJobsAddonSubscription', () => {
  it('reads a valid add-on subscription', () => {
    const sub = fakeSub([fakeItem('mathew_jobs_addon_monthly_v1')]);
    const snap = readJobsAddonSubscription(sub);
    expect(snap.jobsAddonSubscriptionId).toBe('sub_addon_123');
    expect(snap.jobsAddonStatus).toBe('active');
    expect(snap.jobsAddonCurrentPeriodEnd).toBeInstanceOf(Date);
    expect(snap.jobsAddonCancelAt).toBeNull();
  });

  it('throws SubscriptionShapeError on a plan lookup key', () => {
    const sub = fakeSub([fakeItem('mathew_standard_monthly_v1')]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('throws SubscriptionShapeError on an unrecognised key', () => {
    const sub = fakeSub([fakeItem('some_random_key')]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('throws SubscriptionShapeError when there are zero items', () => {
    const sub = fakeSub([]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('throws SubscriptionShapeError when there are two items', () => {
    const sub = fakeSub([
      fakeItem('mathew_jobs_addon_monthly_v1'),
      fakeItem('mathew_jobs_addon_monthly_v1'),
    ]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('maps cancel_at to a Date when present', () => {
    const sub = fakeSub([fakeItem('mathew_jobs_addon_monthly_v1')]);
    sub.cancel_at = 1760000000;
    const snap = readJobsAddonSubscription(sub);
    expect(snap.jobsAddonCancelAt).toBeInstanceOf(Date);
    expect(snap.jobsAddonCancelAt!.getTime()).toBe(1760000000 * 1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/utils/jobs-addon-sync.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `backend/src/utils/jobs-addon-sync.ts`**

```ts
/**
 * Sync for the jobs add-on subscription.
 *
 * Deliberately parallel to subscription-sync.ts, sharing no code with it.
 * Mixing them is how a £5.99 add-on change ends up breaking plan billing.
 */

import Stripe from 'stripe';
import prisma from '../config/database';
import { getStripe } from './stripe';
import { parseJobsAddonLookupKey } from './pricing';
import { SubscriptionShapeError } from './subscription-sync';

export interface JobsAddonSnapshot {
  jobsAddonStatus: string;
  jobsAddonCurrentPeriodEnd: Date | null;
  jobsAddonCancelAt: Date | null;
  jobsAddonSubscriptionId: string;
}

const secondsToDate = (seconds: number | null | undefined): Date | null =>
  typeof seconds === 'number' ? new Date(seconds * 1000) : null;

/**
 * Pure translation. Throws on anything it does not recognise — a plan key,
 * multiple items, or no items — so the plan billing path can never write
 * into the add-on columns and vice versa.
 */
export function readJobsAddonSubscription(
  sub: Stripe.Subscription
): JobsAddonSnapshot {
  const items = sub.items?.data ?? [];

  if (items.length !== 1) {
    throw new SubscriptionShapeError(
      `Add-on subscription ${sub.id} has ${items.length} items; the jobs add-on has exactly one.`
    );
  }

  const item = items[0];
  const parsed = parseJobsAddonLookupKey(item.price?.lookup_key);

  if (!parsed) {
    throw new SubscriptionShapeError(
      `Subscription ${sub.id} is on price ${item.price?.id ?? 'unknown'}, which has no ` +
        'recognised add-on lookup key. It was not created as a jobs add-on.'
    );
  }

  return {
    jobsAddonStatus: sub.status,
    jobsAddonCurrentPeriodEnd: secondsToDate(item.current_period_end),
    jobsAddonCancelAt: secondsToDate(sub.cancel_at),
    jobsAddonSubscriptionId: sub.id,
  };
}

/**
 * Re-fetches the subscription from Stripe and writes to the user's add-on
 * columns. Same re-fetch pattern as reconcileFromSubscription, same reason:
 * Stripe does not guarantee event ordering.
 */
export async function reconcileJobsAddon(
  subscriptionId: string,
  userId: string
): Promise<JobsAddonSnapshot> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const snapshot = readJobsAddonSubscription(sub);

  await prisma.user.update({
    where: { id: userId },
    data: {
      jobsAddonStatus: snapshot.jobsAddonStatus,
      jobsAddonCurrentPeriodEnd: snapshot.jobsAddonCurrentPeriodEnd,
      jobsAddonCancelAt: snapshot.jobsAddonCancelAt,
      jobsAddonSubscriptionId: snapshot.jobsAddonSubscriptionId,
    },
  });

  return snapshot;
}

/**
 * Marks the add-on as ended. Leaves jobsAddonMinimumTermEnd for the record.
 */
export async function clearJobsAddon(
  userId: string,
  status: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      jobsAddonStatus: status,
      jobsAddonCancelAt: null,
      jobsAddonCurrentPeriodEnd: null,
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/utils/jobs-addon-sync.test.ts`
Expected: all PASS

- [ ] **Step 5: Add Stripe product and price helpers in `backend/src/utils/stripe.ts`**

Add import at the top of `stripe.ts`:

```ts
import {
  JOBS_ADDON_MONTHLY_PENCE,
  jobsAddonLookupKey,
} from './pricing';
```

Append after `ensurePlanPrices()` (at end of file):

```ts
// ── Jobs add-on product and price ────────────────────────────────────────────

export async function ensureJobsAddonProduct(): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.products.list({ active: true, limit: 100 });
  const product =
    existing.data.find((p) => p.metadata.mathew_plan === 'jobs_addon') ||
    (await stripe.products.create({
      name: 'Jobs Add-on',
      description: 'Post one job vacancy at a time. £5.99/mo, minimum 3 months.',
      metadata: { mathew_plan: 'jobs_addon' },
    }));
  return product.id;
}

export async function ensureJobsAddonPrice(): Promise<string> {
  const stripe = getStripe();
  const key = jobsAddonLookupKey();
  const page = await stripe.prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
  });

  if (page.data[0]) {
    const price = page.data[0];
    if (price.unit_amount !== JOBS_ADDON_MONTHLY_PENCE) {
      throw new PriceCatalogueError(
        `Stripe price ${key} charges ${price.unit_amount}, expected ${JOBS_ADDON_MONTHLY_PENCE}.`
      );
    }
    return price.id;
  }

  const productId = await ensureJobsAddonProduct();
  const created = await stripe.prices.create({
    currency: 'gbp',
    product: productId,
    lookup_key: key,
    recurring: { interval: 'month' },
    unit_amount: JOBS_ADDON_MONTHLY_PENCE,
  });
  return created.id;
}
```

Add the `PriceCatalogueError` to the import used in that function — it's already defined in `stripe.ts` at line 64, so it's available locally.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/jobs-addon-sync.ts backend/src/utils/jobs-addon-sync.test.ts \
       backend/src/utils/stripe.ts
git commit -m "feat: add jobs-addon-sync module and Stripe product/price helpers"
```

---

### Task 6: Entitlement middleware — `requireFeature` fetches `jobsAddonStatus`

**Files:**
- Modify: `backend/src/middleware/entitlement.ts` (line 25)

**Interfaces:**
- Consumes: updated `features()` signature from Task 3
- Produces: `requireFeature('jobs')` now admits add-on holders

- [ ] **Step 1: Update the select in `backend/src/middleware/entitlement.ts`**

Change line 25 from:

```ts
      select: { planTier: true, paidNurseryCount: true, subscriptionStatus: true },
```

to:

```ts
      select: { planTier: true, paidNurseryCount: true, subscriptionStatus: true, jobsAddonStatus: true },
```

No test needed for this step — the middleware delegates to `features()` which is already tested in Task 3. The integration test is covered by Task 7's end-to-end flow.

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware/entitlement.ts
git commit -m "fix(entitlement): fetch jobsAddonStatus in requireFeature select"
```

---

### Task 7: One-active-job enforcement — `decideActivation` + controller changes

**Files:**
- Create: `backend/src/utils/active-job-limit.ts`
- Create: `backend/src/utils/active-job-limit.test.ts`
- Modify: `backend/src/controllers/nursery.job.controller.ts` (lines 23-87 and 90-139)

**Interfaces:**
- Consumes: `activeJobLimit` from Task 3
- Produces:
  - `decideActivation(opts): { action: 'allow' } | { action: 'swap', deactivateId: string } | { action: 'blocked', conflictId: string }`
  - Updated `nurseryCreateJob` and `nurseryUpdateJob` with `FOR UPDATE` lock and limit enforcement
  - `409 ACTIVE_JOB_LIMIT` response with `{ activeJob: { id, title } }` when blocked

- [ ] **Step 1: Write tests in `backend/src/utils/active-job-limit.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { decideActivation } from './active-job-limit';

describe('decideActivation', () => {
  it('allows anything when limit is null (unlimited)', () => {
    expect(
      decideActivation({ limit: null, currentActiveIds: ['a', 'b', 'c'], targetId: null, replaceId: null })
    ).toEqual({ action: 'allow' });
  });

  it('allows when under the limit', () => {
    expect(
      decideActivation({ limit: 1, currentActiveIds: [], targetId: null, replaceId: null })
    ).toEqual({ action: 'allow' });
  });

  it('blocks when at the limit with no replaceId', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['existing-job'],
      targetId: null,
      replaceId: null,
    });
    expect(result).toEqual({ action: 'blocked', conflictId: 'existing-job' });
  });

  it('swaps when at the limit with a valid replaceId', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['existing-job'],
      targetId: null,
      replaceId: 'existing-job',
    });
    expect(result).toEqual({ action: 'swap', deactivateId: 'existing-job' });
  });

  it('allows re-saving the already-active job (edit, not a new activation)', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['this-job'],
      targetId: 'this-job',
      replaceId: null,
    });
    expect(result).toEqual({ action: 'allow' });
  });

  it('rejects a replaceId that is not in the active list', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['existing-job'],
      targetId: null,
      replaceId: 'wrong-id',
    });
    expect(result).toEqual({ action: 'blocked', conflictId: 'existing-job' });
  });

  it('allows when limit is 0 and there are no active jobs (edge: should not happen, but safe)', () => {
    expect(
      decideActivation({ limit: 0, currentActiveIds: [], targetId: null, replaceId: null })
    ).toEqual({ action: 'allow' });
  });

  it('blocks when limit is 0 and there is an active job', () => {
    const result = decideActivation({
      limit: 0,
      currentActiveIds: ['a'],
      targetId: null,
      replaceId: null,
    });
    expect(result).toEqual({ action: 'blocked', conflictId: 'a' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/utils/active-job-limit.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `backend/src/utils/active-job-limit.ts`**

```ts
export interface ActivationDecision {
  action: 'allow';
} | {
  action: 'swap';
  deactivateId: string;
} | {
  action: 'blocked';
  conflictId: string;
};

/**
 * Pure function — testable without a database.
 *
 * limit null means unlimited. targetId is the job being created/updated; if
 * it is already in currentActiveIds, it is not counted as consuming a slot
 * (re-saving an active job is not a new activation). replaceId is the job
 * the user explicitly agreed to take down.
 */
export function decideActivation(opts: {
  limit: number | null;
  currentActiveIds: string[];
  targetId: string | null;
  replaceId: string | null;
}): ActivationDecision {
  const { limit, currentActiveIds, targetId, replaceId } = opts;

  // Unlimited — always allow.
  if (limit === null) return { action: 'allow' };

  // How many active jobs excluding the one being edited?
  const othersActive = targetId
    ? currentActiveIds.filter((id) => id !== targetId)
    : currentActiveIds;

  // Under the limit — allow.
  if (othersActive.length < limit) return { action: 'allow' };

  // At or over the limit. Is there a valid replacement?
  if (replaceId && currentActiveIds.includes(replaceId)) {
    return { action: 'swap', deactivateId: replaceId };
  }

  // Blocked. Return the first active job for the confirmation dialog.
  return { action: 'blocked', conflictId: othersActive[0] ?? currentActiveIds[0] };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/utils/active-job-limit.test.ts`
Expected: all PASS

- [ ] **Step 5: Update `nurseryCreateJob` in `backend/src/controllers/nursery.job.controller.ts`**

Replace lines 23-87 with:

```ts
export const nurseryCreateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { title, department, location, type, experience, description, responsibilities, requirements, image, replaceActiveJobId } = req.body;

    if (!title || !department || !experience || !description) {
      return res.status(400).json({ success: false, message: 'title, department, experience and description are required' });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Lock the user row to serialise with concurrent publishes
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;

      const owner = await tx.user.findUnique({
        where: { id: userId },
        select: {
          planTier: true,
          paidNurseryCount: true,
          jobsAddonStatus: true,
          nurseryName: true,
          firstName: true,
          lastName: true,
          groups: { take: 1, select: { name: true, city: true, town: true } },
        },
      });

      if (!owner) {
        return { ok: false as const, status: 404, body: { success: false, message: 'User not found' } };
      }

      const limit = activeJobLimit(owner);

      // Count active jobs for this user
      const activeJobs = await tx.job.findMany({
        where: { postedById: userId, isActive: true },
        select: { id: true, title: true },
      });
      const activeIds = activeJobs.map((j: any) => j.id);

      const decision = decideActivation({
        limit,
        currentActiveIds: activeIds,
        targetId: null,
        replaceId: replaceActiveJobId ?? null,
      });

      if (decision.action === 'blocked') {
        const blocker = activeJobs.find((j: any) => j.id === decision.conflictId);
        return {
          ok: false as const,
          status: 409,
          body: {
            success: false,
            code: 'ACTIVE_JOB_LIMIT',
            data: { activeJob: { id: decision.conflictId, title: blocker?.title ?? '' } },
            message: 'You already have a live advert. Swap it or deactivate it first.',
          },
        };
      }

      // If swapping, deactivate the replaced job
      if (decision.action === 'swap') {
        await tx.job.update({
          where: { id: decision.deactivateId },
          data: { isActive: false },
        });
      }

      const group = owner.groups?.[0];
      const resolvedNurseryName =
        group?.name || owner.nurseryName ||
        `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || null;
      const resolvedLocation =
        (location && location.trim()) || group?.town || group?.city || '';

      if (!resolvedLocation) {
        return { ok: false as const, status: 400, body: { success: false, message: 'location is required' } };
      }

      const job = await tx.job.create({
        data: {
          title: title.trim(),
          department: department.trim(),
          location: resolvedLocation.trim(),
          type: type || 'FULL_TIME',
          experience: experience.trim(),
          description: description.trim(),
          responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
          requirements: Array.isArray(requirements) ? requirements : [],
          image: image || null,
          isActive: true,
          postedById: userId,
          nurseryName: resolvedNurseryName,
        },
      });

      return { ok: true as const, job };
    }, { timeout: 10000 });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    res.status(201).json({ success: true, data: result.job });
  } catch (error) {
    next(error);
  }
};
```

Add imports at the top of the file:

```ts
import { activeJobLimit } from '../utils/entitlements';
import { decideActivation } from '../utils/active-job-limit';
```

- [ ] **Step 6: Update `nurseryUpdateJob` in `backend/src/controllers/nursery.job.controller.ts`**

Replace lines 90-139 with:

```ts
export const nurseryUpdateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, department, location, type, experience, description, responsibilities, requirements, image, isActive, replaceActiveJobId } = req.body;

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;

      const existing = await tx.job.findFirst({ where: { id, postedById: userId } });
      if (!existing) {
        return { ok: false as const, status: 404, body: { success: false, message: 'Job not found or not yours' } };
      }

      // Only enforce the limit when activating (going from inactive to active, or staying active)
      if (isActive === true || (isActive === undefined && existing.isActive)) {
        const owner = await tx.user.findUnique({
          where: { id: userId },
          select: { planTier: true, paidNurseryCount: true, jobsAddonStatus: true },
        });

        if (owner) {
          const limit = activeJobLimit(owner);
          const activeJobs = await tx.job.findMany({
            where: { postedById: userId, isActive: true },
            select: { id: true, title: true },
          });
          const activeIds = activeJobs.map((j: any) => j.id);

          const decision = decideActivation({
            limit,
            currentActiveIds: activeIds,
            targetId: id,
            replaceId: replaceActiveJobId ?? null,
          });

          if (decision.action === 'blocked') {
            const blocker = activeJobs.find((j: any) => j.id === decision.conflictId);
            return {
              ok: false as const,
              status: 409,
              body: {
                success: false,
                code: 'ACTIVE_JOB_LIMIT',
                data: { activeJob: { id: decision.conflictId, title: blocker?.title ?? '' } },
                message: 'You already have a live advert. Swap it or deactivate it first.',
              },
            };
          }

          if (decision.action === 'swap') {
            await tx.job.update({
              where: { id: decision.deactivateId },
              data: { isActive: false },
            });
          }
        }
      }

      // Refresh nurseryName from group
      const ownerProfile = await tx.user.findUnique({
        where: { id: userId },
        select: {
          nurseryName: true,
          firstName: true,
          lastName: true,
          groups: { take: 1, select: { name: true } },
        },
      });
      const refreshedNurseryName =
        ownerProfile?.groups?.[0]?.name ||
        ownerProfile?.nurseryName ||
        `${ownerProfile?.firstName ?? ''} ${ownerProfile?.lastName ?? ''}`.trim() ||
        null;

      const job = await tx.job.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(department && { department: department.trim() }),
          ...(location && { location: location.trim() }),
          ...(type && { type }),
          ...(experience && { experience: experience.trim() }),
          ...(description && { description: description.trim() }),
          ...(responsibilities && { responsibilities }),
          ...(requirements && { requirements }),
          ...(image !== undefined && { image }),
          ...(isActive !== undefined && { isActive }),
          nurseryName: refreshedNurseryName,
        },
      });

      return { ok: true as const, job };
    }, { timeout: 10000 });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    res.json({ success: true, data: result.job });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/active-job-limit.ts backend/src/utils/active-job-limit.test.ts \
       backend/src/controllers/nursery.job.controller.ts
git commit -m "feat(jobs): enforce one-active-job limit for add-on holders"
```

---

### Task 8: Stripe routes — checkout, verify, cancel, webhook routing, platinum auto-cancel

**Files:**
- Modify: `backend/src/controllers/stripe.controller.ts` (webhook at lines 336-423, applyChange at 717, verifyUpgradeSession at 850)
- Modify: `backend/src/routes/stripe.routes.ts`

**Interfaces:**
- Consumes:
  - `reconcileJobsAddon`, `clearJobsAddon` from Task 5
  - `ensureJobsAddonPrice` from Task 5
  - `isLive`, `normaliseTier`, `hasJobsAddon` from Tasks 3
  - `JOBS_ADDON_MINIMUM_MONTHS` from Task 1
- Produces:
  - `POST /stripe/jobs-addon/checkout` — returns `{ success: true, url: string }`
  - `POST /stripe/jobs-addon/verify-session` — returns `{ success: true }`
  - `POST /stripe/jobs-addon/cancel` — returns `{ success: true, data: { endsAt: string } }`
  - Updated webhook routing for add-on subscriptions
  - `cancelJobsAddonOnPlatinum(userId)` — called on upgrade

- [ ] **Step 1: Add add-on controller functions to `backend/src/controllers/stripe.controller.ts`**

Add imports at the top:

```ts
import { reconcileJobsAddon, clearJobsAddon } from '../utils/jobs-addon-sync';
import { ensureJobsAddonPrice } from '../utils/stripe';
import { hasJobsAddon } from '../utils/entitlements';
import { JOBS_ADDON_MINIMUM_MONTHS } from '../utils/pricing';
```

Append to the end of the file (after `verifySession`):

```ts
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
 * Creates a Stripe Checkout session for the £5.99/mo jobs add-on.
 * Guards: main plan live, tier is standard, no active add-on already.
 */
export const jobsAddonCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId: string = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorised.' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true,
        subscriptionStatus: true,
        planTier: true,
        jobsAddonStatus: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (!isLive(user)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'Your subscription is not active. Reactivate your plan first.',
      });
    }

    if (normaliseTier(user.planTier) === 'platinum') {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_INCLUDED',
        message: 'Job posting is already included in your Platinum plan.',
      });
    }

    if (hasJobsAddon(user)) {
      return res.status(409).json({
        success: false,
        code: 'ADDON_ALREADY_ACTIVE',
        message: 'You already have an active jobs add-on.',
      });
    }

    if (!user.stripeCustomerId) {
      return res.status(409).json({
        success: false,
        message: 'No Stripe customer found. Please contact support.',
      });
    }

    const priceId = await ensureJobsAddonPrice();

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: user.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        mathew_purpose: 'jobs_addon',
        userId,
      },
      custom_text: {
        submit: {
          message: `⚠️ Monthly recurring payment of £5.99. Minimum commitment of ${JOBS_ADDON_MINIMUM_MONTHS} months. By completing payment you agree to these terms.`,
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

    await prisma.user.update({
      where: { id: meta.userId },
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
      endsAt = new Date((item?.current_period_end ?? sub.current_period_end ?? 0) * 1000);
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
```

- [ ] **Step 2: Update the webhook in `stripe.controller.ts`**

In the `stripeWebhook` function, add the add-on branch inside the `checkout.session.completed` handler. Replace lines 357-382:

```ts
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

      await reconcileFromSubscription(subscriptionId, userId);
      return res.json({ received: true });
    }
```

Update the `customer.subscription.updated` handler (lines 385-395):

```ts
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
```

Update the `customer.subscription.deleted` handler (lines 397-407):

```ts
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
```

- [ ] **Step 3: Call `cancelJobsAddonOnPlatinum` after plan reconcile in `applyChange`**

After line 717 (`const snapshot = await reconcileFromSubscription(result.updatedId, userId);`), add:

```ts
    if (normaliseTier(snapshot.planTier) === 'platinum') {
      await cancelJobsAddonOnPlatinum(userId);
    }
```

- [ ] **Step 4: Call `cancelJobsAddonOnPlatinum` after plan reconcile in `verifyUpgradeSession`**

After line 850 (`const snapshot = await reconcileFromSubscription(subscriptionId, meta.userId);`), add:

```ts
    if (normaliseTier(snapshot.planTier) === 'platinum') {
      await cancelJobsAddonOnPlatinum(meta.userId);
    }
```

- [ ] **Step 5: Add routes in `backend/src/routes/stripe.routes.ts`**

Add imports:

```ts
import {
  jobsAddonCheckout,
  jobsAddonVerifySession,
  jobsAddonCancel,
} from '../controllers/stripe.controller';
```

Add routes before `export default router;`:

```ts
// Jobs add-on
router.post('/jobs-addon/checkout', authenticate, jobsAddonCheckout);
router.post('/jobs-addon/verify-session', authenticate, jobsAddonVerifySession);
router.post('/jobs-addon/cancel', authenticate, jobsAddonCancel);
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/stripe.controller.ts backend/src/routes/stripe.routes.ts
git commit -m "feat(stripe): add jobs add-on checkout, verify, cancel, webhook routing, platinum auto-cancel"
```

---

### Task 9: Entitlements endpoint + frontend hook + API client

**Files:**
- Modify: `backend/src/controllers/nursery-dashboard.controller.ts` (lines 584-633)
- Modify: `frontend/lib/api/nursery.ts` (lines 301-315)
- Modify: `frontend/hooks/use-nursery-plan.ts` (lines 100-141)
- Modify: `frontend/lib/api/jobs.ts` (lines 94-99)

**Interfaces:**
- Consumes: `hasJobsAddon`, `activeJobLimit` from Task 3; `JOBS_ADDON_MONTHLY_PENCE`, `JOBS_ADDON_MINIMUM_MONTHS` from Task 1
- Produces:
  - Entitlements response includes `jobsAddon` and `activeJobLimit`
  - `usePlanFeatures()` exposes `jobsAddon`, `activeJobLimit`
  - `jobService.nurseryCreateJob` and `nurseryUpdateJob` accept `replaceActiveJobId`
  - `stripeService.jobsAddonCheckout()`, `jobsAddonVerifySession()`, `jobsAddonCancel()`

- [ ] **Step 1: Update `getMyEntitlements` in `backend/src/controllers/nursery-dashboard.controller.ts`**

Replace the `select` (lines 597-603) to include add-on columns:

```ts
      select: {
        planTier: true,
        paidNurseryCount: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        cancelAt: true,
        jobsAddonStatus: true,
        jobsAddonCurrentPeriodEnd: true,
        jobsAddonCancelAt: true,
        jobsAddonMinimumTermEnd: true,
      },
```

Add `hasJobsAddon` and `activeJobLimit` to the imports at the top of the file (from `../utils/entitlements`).

Update the response body (lines 612-628) to include:

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
        subscriptionStatus: account.subscriptionStatus,
        isLive: isLive(account),
        currentPeriodEnd: account.currentPeriodEnd,
        cancelAt: account.cancelAt,
        jobsAddon: {
          status: account.jobsAddonStatus,
          isLive: hasJobsAddon(account),
          currentPeriodEnd: account.jobsAddonCurrentPeriodEnd,
          cancelAt: account.jobsAddonCancelAt,
          minimumTermEnd: account.jobsAddonMinimumTermEnd,
          canPurchase: isLive(account) && normaliseTier(account.planTier) === 'standard' && !hasJobsAddon(account),
        },
        activeJobLimit: activeJobLimit(account),
      },
    });
```

- [ ] **Step 2: Update `Entitlements` interface in `frontend/lib/api/nursery.ts`**

Replace lines 301-315:

```ts
export interface JobsAddonInfo {
  status: string;
  isLive: boolean;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  minimumTermEnd: string | null;
  canPurchase: boolean;
}

export interface Entitlements {
  planTier: 'standard' | 'platinum';
  paidNurseryCount: number;
  planLabel: string;
  isGroup: boolean;
  features: PlanFeatureFlags;
  allowance: { paid: number; used: number; remaining: number };
  subscriptionStatus: string;
  isLive: boolean;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  jobsAddon: JobsAddonInfo;
  activeJobLimit: number | null;
}
```

- [ ] **Step 3: Update `usePlanFeatures` in `frontend/hooks/use-nursery-plan.ts`**

Add to the return object (inside the return block at line 117-141):

```ts
    jobsAddon: data?.jobsAddon ?? { status: 'none', isLive: false, currentPeriodEnd: null, cancelAt: null, minimumTermEnd: null, canPurchase: false },
    activeJobLimit: data?.activeJobLimit ?? 0,
```

- [ ] **Step 4: Add Stripe add-on API methods in `frontend/lib/api/nursery.ts`**

Add after the `getEntitlements` method in `nurseryDashboardService`:

```ts
  jobsAddonCheckout: async () => {
    return nurseryApiClient.post<{ url: string }>('/stripe/jobs-addon/checkout', {}, true);
  },
  jobsAddonVerifySession: async (sessionId: string) => {
    return nurseryApiClient.post('/stripe/jobs-addon/verify-session', { sessionId }, true);
  },
  jobsAddonCancel: async () => {
    return nurseryApiClient.post<{ endsAt: string }>('/stripe/jobs-addon/cancel', {}, true);
  },
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/nursery-dashboard.controller.ts \
       frontend/lib/api/nursery.ts frontend/hooks/use-nursery-plan.ts
git commit -m "feat: expose jobsAddon and activeJobLimit in entitlements endpoint and frontend hook"
```

---

### Task 10: Frontend — paywall card, swap dialog, status strip, public banner

**Files:**
- Create: `frontend/components/nursery-dashboard-panel/jobs-paywall-card.tsx`
- Create: `frontend/components/nursery-dashboard-panel/swap-active-job-dialog.tsx`
- Modify: `frontend/components/nursery-dashboard-panel/nursery-job-management.tsx` (lines 280-340 paywall, lines 365-371 Post a Job button)
- Modify: `frontend/components/landing-page/jobs-content.tsx` (insert banner)

**Interfaces:**
- Consumes: `usePlanFeatures`, `nurseryDashboardService` from Task 9
- Produces: complete UI for the add-on purchase, swap, cancel, and public banner

- [ ] **Step 1: Create `frontend/components/nursery-dashboard-panel/jobs-paywall-card.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { Lock, Briefcase, ArrowRight } from 'lucide-react'
import { JOBS_ADDON_MONTHLY_PENCE, JOBS_ADDON_MINIMUM_MONTHS, formatGbp } from '@/lib/pricing'
import { nurseryDashboardService } from '@/lib/api/nursery'
import { toast } from 'sonner'
import { useState } from 'react'

interface JobsPaywallCardProps {
  canPurchaseAddon: boolean
}

export default function JobsPaywallCard({ canPurchaseAddon }: JobsPaywallCardProps) {
  const [loading, setLoading] = useState(false)

  const handleAddonCheckout = async () => {
    setLoading(true)
    try {
      const res = await nurseryDashboardService.jobsAddonCheckout()
      if (res.success && res.data?.url) {
        window.location.href = res.data.url
      } else {
        toast.error((res as any).message || 'Failed to start checkout')
        setLoading(false)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong')
      setLoading(false)
    }
  }

  if (!canPurchaseAddon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-10 max-w-md">
          <Lock size={40} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Platinum Plan Required</h2>
          <p className="text-gray-500 text-sm mb-6">
            Job posting is available on the <strong>Platinum</strong> plan —
            Single Platinum or Group. Upgrade to post jobs and receive
            applications directly from the website.
          </p>
          <Link
            href="/nursery-dashboard/upgrade"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm"
          >
            Upgrade my plan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-lg w-full space-y-6">
        <Briefcase size={40} className="text-primary mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Post jobs from your nursery</h2>
        <p className="text-gray-500 text-sm">
          Advertise vacancies and receive applications directly on the site.
        </p>

        {/* Add-on offer */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Jobs add-on</h3>
            <span className="text-lg font-bold text-primary">{formatGbp(JOBS_ADDON_MONTHLY_PENCE)}/mo</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>One live advert at a time</li>
            <li>Receive applications via the website</li>
            <li>Minimum {JOBS_ADDON_MINIMUM_MONTHS} months</li>
          </ul>
          <button
            onClick={handleAddonCheckout}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm disabled:opacity-50"
          >
            {loading ? 'Redirecting...' : 'Add job posting'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </div>

        {/* Platinum alternative */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs text-gray-400 mb-3">Or unlock unlimited adverts and everything else</p>
          <Link
            href="/nursery-dashboard/upgrade"
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
          >
            Compare plans <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/components/nursery-dashboard-panel/swap-active-job-dialog.tsx`**

```tsx
'use client'

import { X, AlertTriangle } from 'lucide-react'

interface SwapActiveJobDialogProps {
  newJobTitle: string
  activeJobTitle: string
  activeJobId: string
  onConfirm: (replaceId: string) => void
  onCancel: () => void
}

export default function SwapActiveJobDialog({
  newJobTitle,
  activeJobTitle,
  activeJobId,
  onConfirm,
  onCancel,
}: SwapActiveJobDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={18} />
            <h2 className="text-lg font-bold text-gray-900">One live advert at a time</h2>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 transition"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Your plan allows one live advert. Publishing <strong>{newJobTitle}</strong> will
            take <strong>{activeJobTitle}</strong> offline.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(activeJobId)}
              className="px-5 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              Swap & publish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `nursery-job-management.tsx` — replace paywall, add status strip and swap logic**

Replace the paywall block (lines 320-340) with:

```tsx
  if (!canPostJobs) {
    return <JobsPaywallCard canPurchaseAddon={jobsAddon.canPurchase} />
  }
```

Add the import at top:

```tsx
import JobsPaywallCard from './jobs-paywall-card'
import SwapActiveJobDialog from './swap-active-job-dialog'
```

Update the destructuring from `usePlanFeatures()` at line 281:

```tsx
  const { canPostJobs, loading: planLoading, jobsAddon, activeJobLimit, refresh: refreshPlan } = usePlanFeatures()
```

Add state for swap dialog and addon session verification after the existing state declarations (around line 288):

```tsx
  const [swapDialog, setSwapDialog] = useState<{
    newJobTitle: string
    activeJobId: string
    activeJobTitle: string
    pendingPayload: any
    isEdit: boolean
    editId?: string
  } | null>(null)
```

Add a `useEffect` for addon session verification after the group-fetch effect (after line 309):

```tsx
  // Verify add-on checkout session on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const addonSession = params.get('addon_session')
    if (addonSession) {
      nurseryDashboardService.jobsAddonVerifySession(addonSession)
        .then(() => {
          refreshPlan()
          // Clean up the URL
          window.history.replaceState({}, '', window.location.pathname)
          toast.success('Jobs add-on activated!')
        })
        .catch(() => toast.error('Failed to verify add-on payment'))
    }
  }, [])
```

Add the import for `nurseryDashboardService` at top:

```tsx
import { nurseryDashboardService } from '@/lib/api/nursery'
```

Add an add-on status strip after the Stats section (after line 387):

```tsx
      {/* Add-on status strip */}
      {jobsAddon.isLive && activeJobLimit !== null && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
          <span className="text-blue-700">
            Jobs add-on active · one live advert
            {jobsAddon.cancelAt
              ? ` · ends ${new Date(jobsAddon.cancelAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
              : jobsAddon.currentPeriodEnd
                ? ` · renews ${new Date(jobsAddon.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : ''}
          </span>
          {!jobsAddon.cancelAt && (
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to cancel your jobs add-on?')) return
                try {
                  const res = await nurseryDashboardService.jobsAddonCancel()
                  if (res.success && res.data) {
                    toast.success(`Add-on will end on ${new Date(res.data.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`)
                    refreshPlan()
                  } else {
                    toast.error((res as any).message || 'Failed to cancel')
                  }
                } catch { toast.error('Failed to cancel add-on') }
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Cancel add-on
            </button>
          )}
        </div>
      )}
```

Modify `JobFormModal`'s `handleSubmit` to handle the `ACTIVE_JOB_LIMIT` response. In the existing `handleSubmit` (lines 92-119), update the catch path of the API call to detect the 409:

The simplest approach is to update the `onSaved` callback pattern. Instead, update `NurseryJobManagement` to handle the swap dialog by wrapping the form submit. This is more involved — the modal's `handleSubmit` calls `jobService.nurseryCreateJob` or `nurseryUpdateJob`. The 409 response needs to be caught and presented as a swap dialog.

Update `JobFormModal`'s `handleSubmit` to accept a `replaceActiveJobId` parameter and pass it in the payload. Add a new prop `onLimitHit` to `JobFormModalProps`:

```tsx
interface JobFormModalProps {
  initial?: Job | null
  onClose: () => void
  onSaved: () => void
  groupName?: string
  groupLocation?: string
  onLimitHit?: (payload: any, isEdit: boolean, editId?: string, activeJob?: { id: string; title: string }) => void
}
```

Update the `handleSubmit` to accept a `replaceActiveJobId`:

In `JobFormModal`, add a state and method for replaceActiveJobId:

```tsx
  const [replaceId, setReplaceId] = useState<string | null>(null)

  // Called by parent when user confirms swap
  const retryWithReplace = (id: string) => {
    setReplaceId(id)
  }
```

Simpler approach — handle 409 at the `NurseryJobManagement` level. Modify the existing form modal to pass `replaceActiveJobId` in the payload, and detect 409 in the response:

In `handleSubmit` of `JobFormModal`, after the API call:

```tsx
      const payload = {
        ...form,
        responsibilities: form.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
        image: form.image.trim() || null,
        ...(replaceActiveJobId && { replaceActiveJobId }),
      }
```

And handle the response checking for ACTIVE_JOB_LIMIT:

```tsx
      if (!res.success) {
        if ((res as any).code === 'ACTIVE_JOB_LIMIT' && onLimitHit) {
          onLimitHit(payload, isEdit, initial?.id, (res as any).data?.activeJob)
          return
        }
        toast.error(res.message || 'Failed to save job')
      }
```

Add a prop `replaceActiveJobId` to `JobFormModalProps` and use it in the payload construction.

Due to the complexity of wiring this through the existing modal component, here is the clearest approach:

Add to `JobFormModalProps`:

```tsx
  replaceActiveJobId?: string | null
```

In `handleSubmit`, add `replaceActiveJobId` to the payload:

```tsx
      const payload = {
        ...form,
        responsibilities: form.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
        image: form.image.trim() || null,
        ...(replaceActiveJobId && { replaceActiveJobId }),
      }
```

In the error path of `handleSubmit`, call `onLimitHit`:

```tsx
      if (!res.success) {
        if ((res as any).code === 'ACTIVE_JOB_LIMIT' && onLimitHit) {
          onLimitHit(payload, isEdit, initial?.id, (res as any).data?.activeJob)
          onClose()
          return
        }
        toast.error(res.message || 'Failed to save job')
      }
```

In `NurseryJobManagement`, when `swapDialog` is set, show the swap dialog and on confirm, re-call the API with `replaceActiveJobId`:

```tsx
      {swapDialog && (
        <SwapActiveJobDialog
          newJobTitle={swapDialog.newJobTitle}
          activeJobTitle={swapDialog.activeJobTitle}
          activeJobId={swapDialog.activeJobId}
          onCancel={() => setSwapDialog(null)}
          onConfirm={async (replaceId) => {
            setSwapDialog(null)
            try {
              const res = swapDialog.isEdit
                ? await jobService.nurseryUpdateJob(swapDialog.editId!, { ...swapDialog.pendingPayload, replaceActiveJobId: replaceId })
                : await jobService.nurseryCreateJob({ ...swapDialog.pendingPayload, replaceActiveJobId: replaceId })
              if (res.success) {
                toast.success('Job published, previous advert taken offline')
                load()
              } else {
                toast.error((res as any).message || 'Failed to swap')
              }
            } catch { toast.error('Failed to swap jobs') }
          }}
        />
      )}
```

- [ ] **Step 4: Add public banner in `frontend/components/landing-page/jobs-content.tsx`**

Add the import at top:

```tsx
import { JOBS_ADDON_MONTHLY_PENCE, formatGbp } from '@/lib/pricing'
import Link from 'next/link'
```

Insert a banner just before the job list section. Find the main container of the page and add at the top of the jobs list area:

```tsx
        {/* Nursery owner banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-900">Are you a nursery?</p>
            <p className="text-xs text-gray-500 mt-0.5">Advertise your vacancy here from {formatGbp(JOBS_ADDON_MONTHLY_PENCE)}/mo</p>
          </div>
          <Link
            href="/nursery-dashboard/jobs"
            className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
          >
            Post a job
          </Link>
        </div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/nursery-dashboard-panel/jobs-paywall-card.tsx \
       frontend/components/nursery-dashboard-panel/swap-active-job-dialog.tsx \
       frontend/components/nursery-dashboard-panel/nursery-job-management.tsx \
       frontend/components/landing-page/jobs-content.tsx
git commit -m "feat(ui): add jobs paywall card, swap dialog, status strip, public banner"
```

---

### Task 11: Final verification

**Files:** none created

**Interfaces:**
- Consumes: everything from Tasks 1-10

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && npx vitest run`
Expected: all PASS

- [ ] **Step 2: Run the frontend build**

Run: `cd frontend && npm run build`
Expected: build succeeds with no type errors

- [ ] **Step 3: Verify the migration file exists**

Run: `ls backend/prisma/migrations/ | grep jobs-addon`
Expected: one migration directory

- [ ] **Step 4: Run the full test suite one more time to confirm nothing regressed**

Run: `cd backend && npx vitest run`
Expected: all PASS
