# Task 8 Report: In-place upgrades — `preview-change` and `apply-change`

## What was implemented, step by step

### Step 1: Added shared `validateChange` validator
Inserted `ChangeRequest` interface, `ChangeRejection` type, and `validateChange` async function above `createUpgradeSession` in `backend/src/controllers/stripe.controller.ts`. The validator:
- Normalises `plan`/`billingPeriod`/`nurseryCount` from the request body
- Guards against buying down below current nursery usage (returns `BELOW_CURRENT_USAGE` 400)
- Calls `quote()` to refuse Standard groups and 61+ self-serve groups (returns 400 with the PricingError message)
- Returns `{ ok: true, change }` or `{ ok: false, rejection }`

### Step 2: Added `previewChange`
Exported handler for `POST /api/stripe/preview-change`:
- Validates via `validateChange`; returns 400 on rejection
- If user has no live subscription (`!stripeSubscriptionId || !isLive(user)`), returns `requiresCheckout: true` with flat `totalPence` as both `amountDueNowPence` and `nextRenewalPence`
- Otherwise retrieves the Stripe subscription, finds `item = sub.items.data[0]`
- Returns 400 "already on this plan" if tier/billing/quantity are identical to current
- Calls `stripe.invoices.createPreview` with `subscription_details.items` including the item id and new price/quantity, and `proration_behavior: 'always_invoice'`
- Detects interval changes (monthly↔annual) and sets `nextRenewalDate: null` in that case; otherwise reads `item.current_period_end` (per the API version `2026-02-25.clover` rule noted in the brief)
- Returns `{ success, data: { requiresCheckout, amountDueNowPence, nextRenewalPence, nextRenewalDate, intervalChanges, currency, targetLabel } }`

### Step 3: Added `applyChange`
Exported handler for `POST /api/stripe/apply-change`:
- Returns 409 `REQUIRES_CHECKOUT` if no live subscription
- Validates via `validateChange`
- Calls `stripe.subscriptions.update` with `proration_behavior: 'always_invoice'` and the new price/quantity on the existing item id
- Calls `reconcileFromSubscription(updated.id, userId)` to write truth to DB
- Returns snapshot fields: `planTier`, `paidNurseryCount`, `subscriptionStatus`

### Step 4: Rewrote `createUpgradeSession` as reactivation-only
Replaced the old `mode: 'payment'` session that used `describeQuote`/`ensurePlanProducts`/`price_data` with a `mode: 'subscription'` session using a real catalogue Price. Now uses `validateChange` for consistent validation. Passes `customer: user.stripeCustomerId` when available (preserves invoice history). Metadata is minimal: `{ upgrade: 'true', userId }` — no plan/nurseryCount in metadata since the subscription itself is now truth.

### Step 5: Rewrote `verifyUpgradeSession`
Removed the old `planFromMetadata` + `reconcileAccount` approach. Now:
- Retrieves the session, checks `meta.upgrade === 'true'` and `meta.userId`
- Verifies caller matches session owner
- Extracts `subscriptionId` from the session
- Calls `reconcileFromSubscription(subscriptionId, meta.userId)` and returns the snapshot

### Step 6: Rewrote `verifySession`
This was the critical bug fix. The old code called `planFromMetadata` on metadata keys (`plan`, `nurseryCount`) that Task 6 had already deleted from the signup Checkout session, causing every new account to be provisioned as Standard/1 regardless of what was bought. The new implementation:
- Checks `payment_status` is `paid`/`no_payment_required`
- Extracts `subscriptionId` from the session (returns 400 if absent — no subscription means the session is not useful)
- Checks `existedBefore` from DB to set `alreadyExists` in the response
- Calls `ensureAccount(session)` to create/find the user (same logic as the webhook)
- Calls `reconcileFromSubscription(subscriptionId, userId)` to write plan state from the subscription

### Step 7: Fixed imports and deleted dead code

**stripe.controller.ts imports**: Removed `ensurePlanProducts`, `describeQuote`, `planFromMetadata`. Added `parseLookupKey`, `isLive`, `planLabel`. Removed unused `reconcileAccount` function (no remaining callers after Steps 5 and 6).

**pricing.ts**: Deleted `formatGbp` helper and `describeQuote` export (lines 217-243 in original). Both were used exclusively by the old `createUpgradeSession`. The `custom_text.submit.message` in both Checkout sessions now carries the notice wording inline.

**entitlements.ts**: Deleted `planFromMetadata` export and changed `import { MIN_GROUP_SIZE, type PlanTier }` to `import { type PlanTier }` since `MIN_GROUP_SIZE` was only used by `planFromMetadata`.

**pricing.test.ts**: Removed `describeQuote` from imports and deleted the `describe('describeQuote', ...)` block (2 tests).

**entitlements.test.ts**: Removed `planFromMetadata` and `quote` from imports; deleted the `describe('planFromMetadata', ...)` block (5 tests).

### Step 8: Wired the routes
Replaced `backend/src/routes/stripe.routes.ts` to add `preview-change` and `apply-change` (both authenticated), keep `create-upgrade-session` and `verify-upgrade-session` (both authenticated), and keep public `create-checkout-session` and `verify-session`.

## Test commands and output

```
cd backend && npx tsc --noEmit
```
Output: (silent — no errors)

```
cd backend && npx vitest run
```
Output:
```
 RUN  v2.1.9 C:/Users/Tayyab Anwar/Downloads/mathew-main/repo-push/backend

 ✓ src/utils/price-catalogue.test.ts (12 tests) 12ms
 ✓ src/utils/entitlements.test.ts (21 tests) 18ms
 ✓ src/utils/subscription-sync.test.ts (12 tests) 14ms
 ✓ src/utils/pricing.test.ts (18 tests) 26ms
 ✓ src/utils/pricing-parity.test.ts (2 tests) 9ms

 Test Files  5 passed (5)
       Tests  65 passed (65)
    Start at  19:50:02
    Duration  1.90s
```

The suite shrank from 72 to 65 tests (7 deleted: 2 from `describeQuote`, 5 from `planFromMetadata`), all green.

## Deviations from the brief

**`reconcileAccount` deleted**: The brief noted to delete it if it had no remaining callers. After rewriting `verifySession` and `verifyUpgradeSession`, `reconcileAccount` had zero callers and was deleted. This is correct per the brief's explicit instruction.

**`quote(tier, billing, count)` call in `validateChange`**: The brief's `validateChange` calls `quote(tier, billing, count)` where `count` defaults to `0` on invalid input (not `1`). This means a `nurseryCount` of 0 or negative will pass the `inUse` check (since `inUse` is typically ≥ 0) but then fail `quote()` with a `PricingError` ("Number of nurseries must be a whole number of at least 1."), which is returned as a 400. This matches the brief exactly.

## Concerns

**No new unit tests for `previewChange`/`applyChange`**: The brief did not specify TDD for Steps 1-3 (it said "TDD where the brief specifies tests"), and the new controller functions require Stripe SDK mocking + Prisma mocking that the existing test suite doesn't set up. The functions are covered by TypeScript compilation and the integration path is equivalent to the existing webhook handler which is also not unit-tested. This is consistent with the rest of the codebase.

**`verifySession` no longer handles the race-condition write itself**: The old `verifySession` did a full transaction including `processedCheckoutSession.create`. The new one delegates to `ensureAccount` (which has the race handling) and then `reconcileFromSubscription`. The `ensureAccount` function still writes to `processedCheckoutSession` via `prisma.$transaction` for new users, so the deduplication guarantee is preserved. However, `reconcileFromSubscription` is now called even if `ensureAccount` found an existing user without going through the transaction — which means for the "already existed" path the `processedCheckoutSession` row may not be written. This is acceptable: `processedCheckoutSession` was only needed to deduplicate account creation, not plan reconciliation (which is idempotent).
