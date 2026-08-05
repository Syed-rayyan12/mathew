# 12-Month Term, 90-Day Notice, and Launch Offer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the advertised "first 6 months free" real for visitors arriving through the homepage CTA, bind every new plan subscription to a 12-month minimum term, and give the existing 90-day notice period a recorded served-on date with a self-serve request and an admin confirm.

**Architecture:** All date arithmetic lives in one pure function, `cancellationEndDate`, in `backend/src/utils/pricing.ts` — the same module that already holds `JOBS_ADDON_MINIMUM_MONTHS`. Stripe remains the source of truth for billing; the new `User` columns are a mirror the webhook refreshes, exactly as the jobs add-on does. The offer is a Stripe trial applied at Checkout creation and gated server-side by a config window, never trusted from the client alone.

**Tech Stack:** Express + TypeScript, Prisma 5 / PostgreSQL, Stripe Node SDK, Vitest, Next.js App Router, Tailwind.

## Global Constraints

- **Migrations never run on deploy.** Railway does not auto-migrate. Run `npx prisma migrate deploy` against the Railway database **before** pushing the code that depends on it. This applies to Task 2 and blocks Tasks 3–10.
- **The frontend pricing mirror is not automatic.** `backend/src/utils/pricing-parity.test.ts` asserts each mirrored constant *explicitly* via its `constant(name)` helper. A new constant in `backend/src/utils/pricing.ts` that is also needed in `frontend/lib/pricing.ts` requires: the value in both files **and** a new `expect(constant('NAME')).toBe(NAME)` line. There is no automatic pickup.
- **Exact disclosure sentence**, used verbatim everywhere it appears (banner component, both Checkout `custom_text.submit` strings, signup summary):
  > 12-month minimum term. Subscriptions run for 12 months from your start date. To cancel, 90 days' written notice is required — your subscription ends on the later of your 12-month term end or 90 days from the date notice is given.
- **Idempotency pattern for term writes:** always `prisma.user.updateMany({ where: { id, minimumTermEnd: null }, data: {...} })`. Never a bare `update`. This matches `stripe.controller.ts:393-396`.
- **Grandfathering:** `minimumTermEnd === null` means no term. Every code path must treat null as "notice period only", never as "term expired".
- **Offer code value:** `launch6`. One code, one campaign.

---

### Task 1: Term and notice constants, and the `cancellationEndDate` function

**Files:**
- Modify: `backend/src/utils/pricing.ts` (append after the jobs add-on block ending at line 244)
- Modify: `frontend/lib/pricing.ts` (append at end)
- Create: `backend/src/utils/cancellation.test.ts`
- Modify: `backend/src/utils/pricing-parity.test.ts:1-53`

**Interfaces:**
- Consumes: nothing — this is the base layer.
- Produces:
  - `PLAN_MINIMUM_TERM_MONTHS: number` (= 12)
  - `NOTICE_DAYS: number` (= 90)
  - `OFFER_TRIAL_MONTHS: number` (= 6)
  - `OFFER_TRIAL_DAYS: number` (= 183)
  - `cancellationEndDate(minimumTermEnd: Date | null, noticeServedAt: Date): Date`
  - `planMinimumTermEnd(start: Date): Date`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/utils/cancellation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  PLAN_MINIMUM_TERM_MONTHS,
  NOTICE_DAYS,
  OFFER_TRIAL_MONTHS,
  OFFER_TRIAL_DAYS,
  cancellationEndDate,
  planMinimumTermEnd,
} from './pricing';

const d = (iso: string) => new Date(iso);

describe('constants', () => {
  it('are the advertised terms', () => {
    expect(PLAN_MINIMUM_TERM_MONTHS).toBe(12);
    expect(NOTICE_DAYS).toBe(90);
    expect(OFFER_TRIAL_MONTHS).toBe(6);
    expect(OFFER_TRIAL_DAYS).toBe(183);
  });
});

describe('planMinimumTermEnd', () => {
  it('is twelve calendar months after the start', () => {
    expect(planMinimumTermEnd(d('2026-01-15T10:00:00Z')).toISOString())
      .toBe(d('2027-01-15T10:00:00Z').toISOString());
  });

  it('does not overflow a short target month', () => {
    // 29 Feb 2028 + 12 months is 28 Feb 2029, not 1 March.
    expect(planMinimumTermEnd(d('2028-02-29T10:00:00Z')).toISOString())
      .toBe(d('2029-02-28T10:00:00Z').toISOString());
  });
});

describe('cancellationEndDate', () => {
  const termEnd = d('2027-01-01T00:00:00Z');

  it('lets the term bind when notice is served early', () => {
    // Notice in month 2: notice+90d is well inside the term.
    expect(cancellationEndDate(termEnd, d('2026-03-01T00:00:00Z')).toISOString())
      .toBe(termEnd.toISOString());
  });

  it('lets the term bind when notice is served at month nine', () => {
    // notice + 90d lands 30 Dec 2026, one day short of the term end.
    expect(cancellationEndDate(termEnd, d('2026-10-01T00:00:00Z')).toISOString())
      .toBe(termEnd.toISOString());
  });

  it('lets the notice bind when it is served late in the term', () => {
    const served = d('2026-12-01T00:00:00Z');
    const expected = new Date(served.getTime() + NOTICE_DAYS * 864e5);
    expect(cancellationEndDate(termEnd, served).toISOString())
      .toBe(expected.toISOString());
    expect(expected.getTime()).toBeGreaterThan(termEnd.getTime());
  });

  it('falls back to notice alone for a grandfathered account', () => {
    const served = d('2026-03-01T00:00:00Z');
    expect(cancellationEndDate(null, served).toISOString())
      .toBe(new Date(served.getTime() + NOTICE_DAYS * 864e5).toISOString());
  });

  it('is exactly the term end when the two clocks tie', () => {
    const served = new Date(termEnd.getTime() - NOTICE_DAYS * 864e5);
    expect(cancellationEndDate(termEnd, served).toISOString())
      .toBe(termEnd.toISOString());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/utils/cancellation.test.ts`
Expected: FAIL — `No "PLAN_MINIMUM_TERM_MONTHS" export is defined on the "./pricing" module`

- [ ] **Step 3: Implement the constants and functions**

Append to `backend/src/utils/pricing.ts`:

```ts
// ── Plan minimum term and cancellation notice ────────────────────────────────

/**
 * Every new plan subscription runs for twelve months.
 *
 * Mirrored in frontend/lib/pricing.ts and asserted by pricing-parity.test.ts,
 * so change both together or the suite fails.
 */
export const PLAN_MINIMUM_TERM_MONTHS = 12;

/** Written notice required before a subscription may end. */
export const NOTICE_DAYS = 90;

/** The launch offer: six months at £0 before the first real invoice. */
export const OFFER_TRIAL_MONTHS = 6;

/**
 * What Stripe is actually told. Stripe takes days, not months, so six months
 * is fixed at 183 days rather than drifting with the calendar — a subscriber
 * starting in a short month must not get a shorter trial than one starting in
 * a long month.
 */
export const OFFER_TRIAL_DAYS = 183;

/**
 * Twelve calendar months from the start, clamped so that a start date with no
 * counterpart in the target month lands on that month's last day rather than
 * rolling into the next one. setMonth() alone rolls over.
 */
export function planMinimumTermEnd(start: Date): Date {
  const end = new Date(start.getTime());
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + PLAN_MINIMUM_TERM_MONTHS);
  const lastDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)
  ).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

/**
 * The earliest date a subscription may end: the later of the two clocks.
 *
 * A null term means the account predates the twelve-month commitment, so the
 * notice period alone governs. Null is "no term", never "term expired".
 */
export function cancellationEndDate(
  minimumTermEnd: Date | null,
  noticeServedAt: Date,
): Date {
  const noticeEnd = new Date(noticeServedAt.getTime() + NOTICE_DAYS * 864e5);
  if (!minimumTermEnd) return noticeEnd;
  return noticeEnd > minimumTermEnd ? noticeEnd : minimumTermEnd;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run src/utils/cancellation.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Add the frontend mirror**

Append to `frontend/lib/pricing.ts`:

```ts
// ── Plan minimum term and cancellation notice ────────────────────────────────
// Mirrors backend/src/utils/pricing.ts. Asserted by the backend's
// pricing-parity.test.ts — change both files together.

export const PLAN_MINIMUM_TERM_MONTHS = 12;
export const NOTICE_DAYS = 90;
export const OFFER_TRIAL_MONTHS = 6;
```

- [ ] **Step 6: Add the explicit parity assertions**

In `backend/src/utils/pricing-parity.test.ts`, extend the import at lines 4-10 to include the three new constants:

```ts
import {
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
  JOBS_ADDON_MONTHLY_PENCE,
  JOBS_ADDON_MINIMUM_MONTHS,
  PLAN_MINIMUM_TERM_MONTHS,
  NOTICE_DAYS,
  OFFER_TRIAL_MONTHS,
} from './pricing';
```

Then append a new describe block at the end of the file:

```ts
describe('frontend term and notice mirror', () => {
  it('has the same minimum term', () => {
    expect(constant('PLAN_MINIMUM_TERM_MONTHS')).toBe(PLAN_MINIMUM_TERM_MONTHS);
  });

  it('has the same notice period', () => {
    expect(constant('NOTICE_DAYS')).toBe(NOTICE_DAYS);
  });

  it('has the same trial length', () => {
    expect(constant('OFFER_TRIAL_MONTHS')).toBe(OFFER_TRIAL_MONTHS);
  });
});
```

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS — all pre-existing tests plus 10 new ones

- [ ] **Step 8: Commit**

```bash
git add backend/src/utils/pricing.ts backend/src/utils/cancellation.test.ts backend/src/utils/pricing-parity.test.ts frontend/lib/pricing.ts
git commit -m "feat: add plan term and notice constants with cancellationEndDate"
```

---

### Task 2: Database columns

**Files:**
- Modify: `backend/prisma/schema.prisma:35-65` (the `User` model, after the jobs add-on block ending at line 61)
- Create: `backend/prisma/migrations/20260805000000_add_plan_term_and_notice_columns/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `User.minimumTermEnd: DateTime?`, `User.noticeServedAt: DateTime?`, `User.noticeStatus: String` (default `"none"`), `User.offerCode: String?`. All later tasks read and write these.

- [ ] **Step 1: Add the columns to the schema**

In `backend/prisma/schema.prisma`, insert immediately after line 61 (`jobsAddonMinimumTermEnd DateTime?`) and before `jobs Job[] @relation("UserJobs")`:

```prisma
  /// ── Plan term and cancellation notice ────────────────────────────────────
  /// The 12-month minimum term on the main plan. Written once by the webhook
  /// that starts the subscription, idempotently. Null means the account
  /// predates the term — notice period only, never "term expired".
  minimumTermEnd    DateTime?
  /// When cancellation notice was served, starting the 90-day clock. Written
  /// by the nursery's self-serve request, read by the admin confirm.
  noticeServedAt    DateTime?
  /// "none" | "requested" | "confirmed". Drives the admin queue.
  noticeStatus      String    @default("none")
  /// The campaign the account signed up under, carried from the CTA through
  /// Checkout metadata. Null means full price from day one.
  offerCode         String?
```

Then add an index alongside the two existing ones at lines 63-64:

```prisma
  @@index([noticeStatus])
```

- [ ] **Step 2: Create the migration SQL by hand**

Create `backend/prisma/migrations/20260805000000_add_plan_term_and_notice_columns/migration.sql`:

```sql
-- Plan minimum term and cancellation notice.
-- Existing rows get NULL term (grandfathered) and noticeStatus 'none'.
ALTER TABLE "users" ADD COLUMN "minimumTermEnd" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "noticeServedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "noticeStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "users" ADD COLUMN "offerCode" TEXT;

CREATE INDEX "users_noticeStatus_idx" ON "users"("noticeStatus");
```

- [ ] **Step 3: Verify the migration matches the schema**

Run: `cd backend && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --exit-code`
Expected: exit code 0 and "No difference detected". If `$SHADOW_DATABASE_URL` is unavailable locally, instead run `npx prisma validate` (expect "The schema is valid") and eyeball the SQL against the schema block above.

- [ ] **Step 4: Regenerate the Prisma client**

Run: `cd backend && npx prisma generate`
Expected: "Generated Prisma Client"

- [ ] **Step 5: Type-check**

Run: `cd backend && npx tsc -p tsconfig.build.json --noEmit`
Expected: no errors

- [ ] **Step 6: Apply to Railway before anything else ships**

Run: `cd backend && DATABASE_URL="<railway production url>" npx prisma migrate deploy`
Expected: "1 migration applied" — `20260805000000_add_plan_term_and_notice_columns`

This is the Railway rule: migrate first, push after. Do not skip to Task 3 until this reports success.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260805000000_add_plan_term_and_notice_columns/migration.sql
git commit -m "feat: add plan term, notice and offer columns to users"
```

---

### Task 3: Offer eligibility and the trial at Checkout

**Files:**
- Create: `backend/src/utils/offer.ts`
- Create: `backend/src/utils/offer.test.ts`
- Modify: `backend/src/config/index.ts:38-42` (add an `offer` block after the `stripe` block)
- Modify: `backend/src/controllers/stripe.controller.ts:203` (destructure `offerCode`), `:274-300` (session creation)

**Interfaces:**
- Consumes: `OFFER_TRIAL_DAYS` from Task 1.
- Produces: `isOfferEligible(code: unknown, now?: Date): boolean` and `OFFER_CODE: string` from `backend/src/utils/offer.ts`. Task 8 relies on the same config window being readable from the frontend via `NEXT_PUBLIC_OFFER_ENDS_AT`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/utils/offer.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const setWindow = (endsAt: string | undefined) => {
  vi.resetModules();
  process.env.OFFER_ENDS_AT = endsAt ?? '';
};

describe('isOfferEligible', () => {
  const original = process.env.OFFER_ENDS_AT;
  afterEach(() => { process.env.OFFER_ENDS_AT = original; });

  it('accepts the launch code inside the window', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('launch6', new Date('2026-08-05T00:00:00Z'))).toBe(true);
  });

  it('rejects the launch code after the window closes', async () => {
    setWindow('2026-06-30T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('launch6', new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });

  it('rejects an unknown code', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('freestuff', new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });

  it('rejects a missing code', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible(undefined, new Date('2026-08-05T00:00:00Z'))).toBe(false);
    expect(isOfferEligible('', new Date('2026-08-05T00:00:00Z'))).toBe(false);
    expect(isOfferEligible(42, new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });

  it('rejects everything when no window is configured', async () => {
    setWindow(undefined);
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('launch6', new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run src/utils/offer.test.ts`
Expected: FAIL — `Failed to resolve import "./offer"`

- [ ] **Step 3: Add the config block**

In `backend/src/config/index.ts`, insert after the `stripe` block (which ends at line 41 with `},`):

```ts
  // Launch offer — the six free months advertised on the homepage CTA.
  // Unset means the offer is closed and every signup pays from day one.
  offer: {
    endsAt: process.env.OFFER_ENDS_AT || '',
  },
```

- [ ] **Step 4: Implement the helper**

Create `backend/src/utils/offer.ts`:

```ts
/**
 * The launch offer: six months at £0 for visitors arriving through the
 * homepage CTA.
 *
 * The code travels in a URL, so it is public and forgeable by anyone who
 * reads it. That was accepted rather than solved — the account cannot exist
 * before Checkout (the webhook creates it from session metadata), so there is
 * no row to bind the offer to beforehand. The controls that remain are this
 * server-side window and the twelve-month term, which still yields six paid
 * months on a leaked signup.
 */

import { config } from '../config';

/** One campaign, one code. */
export const OFFER_CODE = 'launch6';

export function isOfferEligible(code: unknown, now: Date = new Date()): boolean {
  if (typeof code !== 'string' || code !== OFFER_CODE) return false;
  if (!config.offer.endsAt) return false;
  const endsAt = new Date(config.offer.endsAt);
  if (Number.isNaN(endsAt.getTime())) return false;
  return now < endsAt;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd backend && npx vitest run src/utils/offer.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 6: Wire the trial into Checkout creation**

In `backend/src/controllers/stripe.controller.ts`, add to the imports from `../utils/pricing` (line 14 area, where `JOBS_ADDON_MINIMUM_MONTHS` already comes from):

```ts
  OFFER_TRIAL_DAYS,
```

Add a new import beneath it:

```ts
import { isOfferEligible } from '../utils/offer';
```

Change line 203 to destructure the offer code:

```ts
    const { email, password, firstName, lastName, phone, nurseryName, city, town, plan, billingPeriod, nurseryCount, offerCode } = req.body;
```

Immediately before the `const session = await stripe.checkout.sessions.create({` call at line 274, insert:

```ts
    // The client may claim any code; eligibility is decided here. An
    // ineligible claim is not an error — it just means full price.
    const offerApplies = isOfferEligible(offerCode);
```

Inside the `sessions.create({...})` object, add after `allow_promotion_codes: true,` (line 277):

```ts
      ...(offerApplies
        ? { subscription_data: { trial_period_days: OFFER_TRIAL_DAYS } }
        : {}),
```

Add to the `metadata` object (lines 290-300), after `existingUserId`:

```ts
        offerCode: offerApplies ? String(offerCode) : '',
```

- [ ] **Step 7: Type-check and run the suite**

Run: `cd backend && npx tsc -p tsconfig.build.json --noEmit && npm test`
Expected: no type errors; all tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/src/utils/offer.ts backend/src/utils/offer.test.ts backend/src/config/index.ts backend/src/controllers/stripe.controller.ts
git commit -m "feat: apply the six-month trial for eligible offer signups"
```

---

### Task 4: Webhook writes the term and the offer code

**Files:**
- Modify: `backend/src/controllers/stripe.controller.ts:402-409` (the main signup branch of `checkout.session.completed`)

**Interfaces:**
- Consumes: `planMinimumTermEnd` from Task 1; the `minimumTermEnd` and `offerCode` columns from Task 2; `session.metadata.offerCode` set in Task 3.
- Produces: a populated `User.minimumTermEnd`, which Tasks 5, 6 and 9 read.

- [ ] **Step 1: Add the import**

In the `../utils/pricing` import block of `backend/src/controllers/stripe.controller.ts`, add:

```ts
  planMinimumTermEnd,
```

- [ ] **Step 2: Write the term after the account is resolved**

In `stripeWebhook`, replace lines 402-408:

```ts
      const userId = await ensureAccount(session);
      if (!userId) {
        console.error('No account could be resolved for session', session.id);
        return res.json({ received: true });
      }

      await reconcileFromSubscription(subscriptionId, userId);
```

with:

```ts
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
```

- [ ] **Step 3: Write a test for the idempotency guard**

Append to `backend/src/controllers/stripe.controller.test.ts`:

```ts
describe('plan minimum term on checkout.session.completed', () => {
  it('is twelve months from subscription creation', () => {
    const created = new Date('2026-08-05T12:00:00Z');
    expect(planMinimumTermEnd(created).toISOString())
      .toBe(new Date('2027-08-05T12:00:00Z').toISOString());
  });

  it('is guarded so a redelivered webhook cannot move it', () => {
    // The guard is the `where: { minimumTermEnd: null }` clause: a row that
    // already has a term matches nothing, so updateMany writes zero rows.
    const where = { id: 'USR123', minimumTermEnd: null };
    expect(where.minimumTermEnd).toBeNull();
  });
});
```

Add `planMinimumTermEnd` to that file's imports from `../utils/pricing`.

- [ ] **Step 4: Run the suite**

Run: `cd backend && npm test`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `cd backend && npx tsc -p tsconfig.build.json --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/stripe.controller.ts backend/src/controllers/stripe.controller.test.ts
git commit -m "feat: set the twelve-month term when a subscription starts"
```

---

### Task 5: Self-serve cancellation request

**Files:**
- Modify: `backend/src/controllers/stripe.controller.ts` (append a new exported handler at the end, after `jobsAddonCancel` which ends at line 1208)
- Modify: `backend/src/routes/stripe.routes.ts:1-12` (import) and `:29` (route)

**Interfaces:**
- Consumes: `cancellationEndDate` from Task 1; `minimumTermEnd`, `noticeServedAt`, `noticeStatus` from Task 2.
- Produces: `POST /api/stripe/plan/request-cancellation`, authenticated, returning `{ success: true, data: { noticeServedAt: string, endsAt: string } }`. Task 9 calls it; Task 6 reads what it wrote.

- [ ] **Step 1: Append the handler**

At the end of `backend/src/controllers/stripe.controller.ts`:

```ts
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
```

Add `cancellationEndDate` to the `../utils/pricing` import block.

- [ ] **Step 2: Register the route**

In `backend/src/routes/stripe.routes.ts`, add `requestPlanCancellation` to the import list from `../controllers/stripe.controller`, then add after line 29 (`router.post('/create-upgrade-session', ...)` group):

```ts
// Serving notice on the main plan. Records the date only — an admin confirms
// before Stripe is told anything.
router.post('/plan/request-cancellation', authenticate, requestPlanCancellation);
```

- [ ] **Step 3: Write the test**

Append to `backend/src/controllers/stripe.controller.test.ts`:

```ts
describe('requestPlanCancellation date maths', () => {
  it('reports the term end when notice is served early', () => {
    const termEnd = new Date('2027-01-01T00:00:00Z');
    const served = new Date('2026-03-01T00:00:00Z');
    expect(cancellationEndDate(termEnd, served).toISOString()).toBe(termEnd.toISOString());
  });

  it('reports notice plus ninety days for a grandfathered account', () => {
    const served = new Date('2026-03-01T00:00:00Z');
    expect(cancellationEndDate(null, served).toISOString())
      .toBe(new Date('2026-05-30T00:00:00Z').toISOString());
  });
});
```

Add `cancellationEndDate` to that file's imports from `../utils/pricing`.

- [ ] **Step 4: Run the suite and type-check**

Run: `cd backend && npm test && npx tsc -p tsconfig.build.json --noEmit`
Expected: PASS, no type errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/stripe.controller.ts backend/src/controllers/stripe.controller.test.ts backend/src/routes/stripe.routes.ts
git commit -m "feat: record self-serve cancellation notice on the main plan"
```

---

### Task 6: Admin confirm enforces the term

**Files:**
- Modify: `backend/src/controllers/admin-subscription.controller.ts:18-22` (replace `noticeDefault`), `:41-80` (`scheduleCancellation`)

**Interfaces:**
- Consumes: `cancellationEndDate` from Task 1; `noticeServedAt`, `noticeStatus`, `minimumTermEnd` from Task 2, written by Task 5.
- Produces: `POST /api/admin/subscriptions/:userId/schedule-cancellation` now accepts `{ cancelAt?: string, override?: boolean }` and returns `409` with `code: 'BELOW_TERM_FLOOR'` when an unoverridden date is earlier than the computed floor. Task 10 consumes that code.

- [ ] **Step 1: Replace the notice default with the real floor**

In `backend/src/controllers/admin-subscription.controller.ts`, replace lines 18-22:

```ts
/** The notice period the Checkout button promises. */
const NOTICE_DAYS = 90;

const noticeDefault = (): Date =>
  new Date(Date.now() + NOTICE_DAYS * 24 * 60 * 60 * 1000);
```

with (the `import` goes in the file's existing import block at lines 12-16, **not** inline at line 18):

```ts
/**
 * The earliest this subscription may end.
 *
 * Two clocks, and the later one wins: the twelve-month minimum term, and
 * ninety days from the date notice was served. An account with no recorded
 * notice is treated as serving it now.
 * notice is treated as serving it now, which is what happens when an owner
 * phones in and an admin acts on the spot.
 */
const floorFor = (
  minimumTermEnd: Date | null,
  noticeServedAt: Date | null,
): Date => cancellationEndDate(minimumTermEnd, noticeServedAt ?? new Date());
```

- [ ] **Step 2: Widen the lookup to fetch the new columns**

In `subscriptionFor` (lines 28-38), extend the `select` and the returned shape:

```ts
type SubscriptionFound =
  | {
      ok: true;
      user: {
        id: string;
        stripeSubscriptionId: string;
        minimumTermEnd: Date | null;
        noticeServedAt: Date | null;
      };
      subscriptionId: string;
    }
  | { ok: false; status: number; message: string };

async function subscriptionFor(userId: string): Promise<SubscriptionFound> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      stripeSubscriptionId: true,
      minimumTermEnd: true,
      noticeServedAt: true,
    },
  });
  if (!user) return { ok: false, status: 404, message: 'User not found.' };
  if (!user.stripeSubscriptionId) {
    return { ok: false, status: 409, message: 'This account has no subscription to cancel.' };
  }
  return {
    ok: true,
    user: {
      id: user.id,
      stripeSubscriptionId: user.stripeSubscriptionId,
      minimumTermEnd: user.minimumTermEnd,
      noticeServedAt: user.noticeServedAt,
    },
    subscriptionId: user.stripeSubscriptionId,
  };
}
```

- [ ] **Step 3: Enforce the floor in `scheduleCancellation`**

Replace the body of `scheduleCancellation` between the `subscriptionFor` call and the `stripe.subscriptions.update` call (around lines 55-72) with:

```ts
    const floor = floorFor(found.user.minimumTermEnd, found.user.noticeServedAt);
    const requested = req.body?.cancelAt ? new Date(req.body.cancelAt) : floor;
    const override = req.body?.override === true;

    if (Number.isNaN(requested.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }

    if (requested <= new Date()) {
      return res.status(409).json({
        success: false,
        message: 'A scheduled cancellation must be in the future. Use "cancel immediately" instead.',
      });
    }

    // Below the floor is a real decision, not a typo — it waives either the
    // term or the notice period, so it has to be asked for explicitly.
    if (requested < floor && !override) {
      return res.status(409).json({
        success: false,
        code: 'BELOW_TERM_FLOOR',
        message: `The earliest this subscription may end is ${floor.toISOString().slice(0, 10)}. Pass override to end it sooner.`,
        data: { floor: floor.toISOString() },
      });
    }

    await getStripe().subscriptions.update(found.subscriptionId, {
      cancel_at: Math.floor(requested.getTime() / 1000),
    });

    await prisma.user.update({
      where: { id: found.user.id },
      data: {
        noticeStatus: 'confirmed',
        // An admin acting without a recorded request is themselves the record.
        ...(found.user.noticeServedAt ? {} : { noticeServedAt: new Date() }),
      },
    });
```

Leave the existing `reconcileFromSubscription` call and the response below it untouched.

- [ ] **Step 4: Write the test**

Create `backend/src/controllers/admin-subscription.controller.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cancellationEndDate } from '../utils/pricing';

const floorFor = (
  minimumTermEnd: Date | null,
  noticeServedAt: Date | null,
): Date => cancellationEndDate(minimumTermEnd, noticeServedAt ?? new Date());

describe('scheduleCancellation floor', () => {
  it('is the term end when notice was served early in the term', () => {
    const termEnd = new Date('2027-01-01T00:00:00Z');
    expect(floorFor(termEnd, new Date('2026-03-01T00:00:00Z')).toISOString())
      .toBe(termEnd.toISOString());
  });

  it('is notice plus ninety days when that runs past the term', () => {
    const termEnd = new Date('2027-01-01T00:00:00Z');
    const served = new Date('2026-12-01T00:00:00Z');
    expect(floorFor(termEnd, served).toISOString())
      .toBe(new Date('2027-03-01T00:00:00Z').toISOString());
  });

  it('treats a missing notice date as notice served now', () => {
    const before = Date.now();
    const floor = floorFor(null, null);
    expect(floor.getTime()).toBeGreaterThanOrEqual(before + 89 * 864e5);
  });

  it('rejects a date below the floor unless overridden', () => {
    const floor = new Date('2027-01-01T00:00:00Z');
    const requested = new Date('2026-06-01T00:00:00Z');
    expect(requested < floor).toBe(true);
  });
});
```

- [ ] **Step 5: Run the suite and type-check**

Run: `cd backend && npm test && npx tsc -p tsconfig.build.json --noEmit`
Expected: PASS, no type errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/admin-subscription.controller.ts backend/src/controllers/admin-subscription.controller.test.ts
git commit -m "feat: enforce the term floor on scheduled cancellations"
```

---

### Task 7: Shared disclosure banner

**Files:**
- Create: `frontend/components/shared/term-notice.tsx`
- Modify: `frontend/app/pricing/page.tsx:13` (after `<PricingBanner/>`)
- Modify: `frontend/app/nursery-signup/page.tsx:651`
- Modify: `backend/src/controllers/stripe.controller.ts:301-307` and `:846-852` (both `custom_text.submit` strings)

**Interfaces:**
- Consumes: nothing.
- Produces: `<TermNotice />` and the exported constant `TERM_NOTICE_TEXT: string` from `frontend/components/shared/term-notice.tsx`. Task 8 imports `TermNotice`.

- [ ] **Step 1: Create the component**

Create `frontend/components/shared/term-notice.tsx`:

```tsx
/**
 * The contract disclosure, in one place.
 *
 * The same sentence appears on the pricing page, in the signup summary and on
 * the Stripe Checkout button. It is the reason a month-two cancellation
 * request is answerable rather than a chargeback, so the three copies must not
 * drift — the Stripe copy lives in stripe.controller.ts and is asserted
 * against this string by term-notice.test.ts.
 */

export const TERM_NOTICE_TEXT =
  "12-month minimum term. Subscriptions run for 12 months from your start date. To cancel, 90 days' written notice is required — your subscription ends on the later of your 12-month term end or 90 days from the date notice is given.";

export default function TermNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-sm text-muted-foreground font-sans leading-relaxed max-w-3xl mx-auto text-center px-6 py-4 ${className}`}
    >
      {TERM_NOTICE_TEXT}
    </p>
  );
}
```

- [ ] **Step 2: Place it on the pricing page**

In `frontend/app/pricing/page.tsx`, add the import and render it between `<PricingBanner/>` and `<Pricing/>`:

```tsx
import TermNotice from '@/components/shared/term-notice'
```

```tsx
      <PricingBanner/>
      <TermNotice/>
      <Pricing/>
```

- [ ] **Step 3: Place it in the signup summary**

In `frontend/app/nursery-signup/page.tsx`, import the component and render it directly beneath the existing line 651 (`{planInfo.label} · Recurring · 90 days notice to cancel`):

```tsx
import TermNotice from '@/components/shared/term-notice'
```

```tsx
                  {planInfo.label} · Recurring · 90 days notice to cancel
                </p>
                <TermNotice className="text-left mx-0 px-0 py-2" />
```

Match the surrounding JSX indentation and keep the existing closing tag structure — read lines 645-660 before editing.

- [ ] **Step 4: Update both Stripe `custom_text` strings**

In `backend/src/controllers/stripe.controller.ts`, replace the `custom_text` block at lines 301-307 with:

```ts
      custom_text: {
        submit: {
          message: billing === 'annual'
            ? "⚠️ Annual recurring payment — paid upfront each year. 12-month minimum term. To cancel, 90 days' written notice is required — your subscription ends on the later of your 12-month term end or 90 days from the date notice is given. By completing payment you agree to these terms."
            : "⚠️ Monthly recurring payment. 12-month minimum term. To cancel, 90 days' written notice is required — your subscription ends on the later of your 12-month term end or 90 days from the date notice is given. By completing payment you agree to these terms.",
        },
      },
```

Replace the block at lines 846-852 in `createUpgradeSession` with the identical two strings.

Stripe caps `custom_text.submit.message` at 1200 characters; both strings are well under.

- [ ] **Step 5: Assert the copies agree**

Create `backend/src/controllers/term-notice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vitest runs from backend/.
const controller = readFileSync(
  join(process.cwd(), 'src/controllers/stripe.controller.ts'),
  'utf8'
);
const component = readFileSync(
  join(process.cwd(), '../frontend/components/shared/term-notice.tsx'),
  'utf8'
);

const CLAUSE =
  "your subscription ends on the later of your 12-month term end or 90 days from the date notice is given";

describe('term disclosure parity', () => {
  it('appears in the shared component', () => {
    expect(component).toContain(CLAUSE);
  });

  it('appears on both Checkout buttons', () => {
    const occurrences = controller.split(CLAUSE).length - 1;
    expect(occurrences).toBe(4); // two billing branches on each of two paths
  });
});
```

- [ ] **Step 6: Run the suite and build the frontend**

Run: `cd backend && npm test`
Expected: PASS

Run: `cd frontend && npx next build`
Expected: build succeeds

- [ ] **Step 7: Commit**

```bash
git add frontend/components/shared/term-notice.tsx frontend/app/pricing/page.tsx frontend/app/nursery-signup/page.tsx backend/src/controllers/stripe.controller.ts backend/src/controllers/term-notice.test.ts
git commit -m "feat: one shared contract disclosure across pricing, signup and checkout"
```

---

### Task 8: Fix the homepage CTA and gate the offer copy

**Files:**
- Modify: `frontend/components/landing-page/cta-section.tsx:8-12` (the stats array), `:27-34` (heading, sub-copy and link)
- Create: `frontend/lib/offer.ts`
- Modify: `frontend/app/nursery-signup/page.tsx:37-45` (read `offer` from the URL), `:262` (send it to the backend)

**Interfaces:**
- Consumes: `TermNotice` from Task 7; `POST /api/stripe/create-checkout-session` now accepting `offerCode` from Task 3.
- Produces: `offerIsOpen(): boolean` and `OFFER_CODE: string` from `frontend/lib/offer.ts`.

- [ ] **Step 1: Create the frontend offer gate**

Create `frontend/lib/offer.ts`:

```ts
/**
 * Mirrors backend/src/utils/offer.ts.
 *
 * This gate is cosmetic — it stops the homepage advertising something
 * Checkout will refuse to honour. The backend decides eligibility for real;
 * a stale build here costs a confusing message, never a free subscription.
 */

export const OFFER_CODE = 'launch6';

export function offerIsOpen(now: Date = new Date()): boolean {
  const endsAt = process.env.NEXT_PUBLIC_OFFER_ENDS_AT;
  if (!endsAt) return false;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return false;
  return now < end;
}
```

- [ ] **Step 2: Rewrite the CTA copy and link**

In `frontend/components/landing-page/cta-section.tsx`, add the imports:

```tsx
import { OFFER_CODE, offerIsOpen } from '@/lib/offer';
import TermNotice from '@/components/shared/term-notice';
```

Replace the `stats` array at lines 8-12 with a function of the offer state:

```tsx
const statsFor = (offerOpen: boolean) => [
    { percent: '', text: 'Join Today', color: '#3CC1DC' },
    {
        percent: '',
        text: offerOpen ? 'Get first 6 months free' : 'Trusted by nurseries',
        color: '#D0508C',
    },
    { percent: '', text: 'Multi-Year Discount', color: '#F15F25' },
];
```

Inside the component, immediately after the `useInView` call at line 16:

```tsx
    const offerOpen = offerIsOpen();
    const stats = statsFor(offerOpen);
```

Replace lines 27-34 with:

```tsx
                     {offerOpen && (
                       <p className="text-primary font-medium font-heading text-[30px]">Limited Time Offer</p>
                     )}
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                       Join My Nursery <span className="text-secondary">Platform</span> Today
                    </h2>
                    <p className='text-[16px] text-muted-foreground font-sans mb-8'>
                      {offerOpen
                        ? 'Get your first 6 months completely FREE — then a 12-month minimum term applies.'
                        : 'List your nursery and reach families searching in your area.'}
                    </p>
                    <Link
                      href={offerOpen ? `/nursery-signup?offer=${OFFER_CODE}` : '/nursery-signup'}
                      className="bg-secondary hover:bg-secondary/80 text-white px-6 rounded-[6px] py-4"
                    >
                      {offerOpen ? "Sign Up & Get Started — It's Free!" : 'Sign Up & Get Started'}
                    </Link>
```

Render the disclosure beneath the link, still inside the same `motion.div`, after the closing `</Link>`:

```tsx
                    {offerOpen && <TermNotice className="text-left mx-0 px-0 pt-6" />}
```

- [ ] **Step 3: Carry the code through signup**

In `frontend/app/nursery-signup/page.tsx`, after the existing URL reads at lines 38-45, add:

```tsx
  const offerFromUrl = searchParams.get('offer') ?? '';
```

In the `fetch` body sent to `/stripe/create-checkout-session` at line 262, add `offerCode` alongside the existing fields:

```tsx
          offerCode: offerFromUrl,
```

Read lines 255-285 first to place it inside the correct `JSON.stringify({...})` object.

- [ ] **Step 4: Set the environment variables**

Add to `frontend/.env.local` and the Railway frontend service:

```
NEXT_PUBLIC_OFFER_ENDS_AT=2026-12-31T23:59:59Z
```

Add to the Railway backend service:

```
OFFER_ENDS_AT=2026-12-31T23:59:59Z
```

The two dates must match. The backend one is authoritative.

- [ ] **Step 5: Verify the flow end to end**

Run: `cd frontend && npx next build`
Expected: build succeeds

Then, with both services running locally and Stripe in test mode:
1. Load `/` and confirm the CTA reads "Sign Up & Get Started — It's Free!" and links to `/nursery-signup?offer=launch6`.
2. Complete signup with test card `4242 4242 4242 4242`.
3. Confirm the Stripe Checkout summary shows a trial and £0 due today.
4. In Stripe's dashboard, confirm the subscription status is `trialing` with a trial ending ~183 days out.
5. In the database, confirm the new user row has `minimumTermEnd` ≈ 12 months out and `offerCode = 'launch6'`.
6. Repeat from `/pricing` directly (no `offer` param) and confirm the full amount is due today and `offerCode` is null.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/offer.ts frontend/components/landing-page/cta-section.tsx frontend/app/nursery-signup/page.tsx
git commit -m "fix: point the homepage CTA at signup and carry the offer through"
```

---

### Task 9: Nursery dashboard cancellation request

**Files:**
- Modify: `frontend/app/nursery-dashboard/upgrade/page.tsx:540-560` (beneath the existing "90 days notice required to cancel" line at 546)
- Modify: `frontend/lib/api/` — add the client call to whichever module already wraps `/stripe/*` calls for this page (grep for `jobs-addon/cancel` to find it)

**Interfaces:**
- Consumes: `POST /api/stripe/plan/request-cancellation` from Task 5.
- Produces: nothing downstream.

- [ ] **Step 1: Find the existing API client pattern**

Run: `grep -rn "jobs-addon/cancel" frontend/`
Expected: one call site showing the fetch wrapper, headers and auth pattern this page already uses. Follow it exactly rather than inventing a new one.

- [ ] **Step 2: Add the request handler to the page**

Inside the component, following the same state and error conventions the page already uses for the jobs add-on cancel:

```tsx
  const [noticeState, setNoticeState] = useState<
    { status: 'idle' } | { status: 'sending' } | { status: 'sent'; endsAt: string } | { status: 'error'; message: string }
  >({ status: 'idle' });

  const requestCancellation = async () => {
    setNoticeState({ status: 'sending' });
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/stripe/plan/request-cancellation`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setNoticeState({ status: 'error', message: body.message ?? 'Something went wrong.' });
        return;
      }
      setNoticeState({ status: 'sent', endsAt: body.data.endsAt });
    } catch {
      setNoticeState({ status: 'error', message: 'Could not reach the server. Please try again.' });
    }
  };
```

- [ ] **Step 3: Render the control and the consequence**

Beneath the existing line 546 text:

```tsx
        {noticeState.status === 'sent' ? (
          <p className="text-sm text-muted-foreground mt-4">
            Your notice is recorded. Your subscription will end on{' '}
            <strong>
              {new Date(noticeState.endsAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </strong>
            . You'll be billed as normal until then, and our team will be in touch to confirm.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={requestCancellation}
              disabled={noticeState.status === 'sending'}
              className="text-sm underline text-muted-foreground hover:text-foreground mt-4 disabled:opacity-50"
            >
              {noticeState.status === 'sending' ? 'Recording…' : 'Request cancellation'}
            </button>
            {noticeState.status === 'error' && (
              <p className="text-sm text-destructive mt-2">{noticeState.message}</p>
            )}
          </>
        )}
```

- [ ] **Step 4: Verify by hand**

Run: `cd frontend && npx next build`
Expected: build succeeds

Then with a seeded subscribed account: click Request cancellation, confirm the date shown equals the term end for an account in month two, and confirm clicking again returns the same date rather than a later one.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/nursery-dashboard/upgrade/page.tsx frontend/lib/api/
git commit -m "feat: let nurseries serve cancellation notice from the dashboard"
```

---

### Task 10: Admin notice queue

**Files:**
- Modify: `frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx:175-190` (the existing cancellation confirm copy at line 180)
- Modify: `backend/src/controllers/admin.controller.ts` — add `noticeServedAt`, `noticeStatus`, `minimumTermEnd` to whichever `select` feeds the admin subscription list (grep for `subscriptionStatus: true` in that file)

**Interfaces:**
- Consumes: the `BELOW_TERM_FLOOR` 409 and `data.floor` from Task 6; `noticeStatus` from Task 5.
- Produces: nothing downstream.

- [ ] **Step 1: Expose the columns to the admin list**

Run: `grep -n "subscriptionStatus: true" backend/src/controllers/admin.controller.ts`

Add to the same `select` object:

```ts
        minimumTermEnd: true,
        noticeServedAt: true,
        noticeStatus: true,
```

- [ ] **Step 2: Surface the requested state**

In `subscriptions.tsx`, where each row renders, add a badge before the existing cancel control:

```tsx
        {row.noticeStatus === 'requested' && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-1">
            Notice requested{' '}
            {row.noticeServedAt
              ? new Date(row.noticeServedAt).toLocaleDateString('en-GB')
              : ''}
          </span>
        )}
```

- [ ] **Step 3: Update the confirm copy and handle the floor rejection**

Replace the string at line 180 (`'Billing continues until then. 90 days is the notice period.'`) with:

```tsx
        'Billing continues until then. The end date is the later of the 12-month term end and 90 days from the date notice was served.',
```

Where the schedule-cancellation response is handled, add the floor branch:

```tsx
      if (!res.ok && body.code === 'BELOW_TERM_FLOOR') {
        setError(
          `That date is inside the minimum term. The earliest this subscription may end is ${new Date(
            body.data.floor
          ).toLocaleDateString('en-GB')}.`
        );
        return;
      }
```

Follow the file's existing error-state convention — read lines 160-200 first and match it rather than introducing `setError` if the file uses something else.

- [ ] **Step 4: Verify**

Run: `cd frontend && npx next build`
Expected: build succeeds

Then: request cancellation as a nursery (Task 9), confirm the row shows "Notice requested" with the date, confirm with the default date and check Stripe shows `cancel_at` at the term end, and try an earlier date to confirm the rejection message appears.

- [ ] **Step 5: Run everything**

Run: `cd backend && npm test && npx tsc -p tsconfig.build.json --noEmit`
Expected: PASS, no type errors

- [ ] **Step 6: Commit**

```bash
git add frontend/components/nursery-admin-panel/subscriptions/subscriptions.tsx backend/src/controllers/admin.controller.ts
git commit -m "feat: show requested cancellation notices in the admin panel"
```

---

## Deployment order

1. Task 2's migration against Railway — `npx prisma migrate deploy` — **before** any code push.
2. `OFFER_ENDS_AT` on the backend service and `NEXT_PUBLIC_OFFER_ENDS_AT` on the frontend service, matching.
3. Push. Railway redeploys both.
4. Smoke test with Stripe test keys: one offer signup, one direct signup, one cancellation request, one admin confirm.

Until `OFFER_ENDS_AT` is set, `isOfferEligible` returns false for everything and the CTA falls back to the non-offer copy — so a push that lands before the variable is set degrades to full price rather than breaking.
