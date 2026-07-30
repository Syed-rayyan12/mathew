# Task 11 Report: Admin can see and end a subscription

## What was implemented

### Step 1 — Billing columns added to `getSubscriptions` (admin.controller.ts)

- Added `isLive` to the `../utils/entitlements` import.
- Added `subscriptionStatus`, `currentPeriodEnd`, `cancelAt`, `stripeSubscriptionId` to the Prisma `select`.
- Added `subscriptionStatus`, `isLive`, `currentPeriodEnd`, `cancelAt`, and `canCancel` to the mapped output object (alongside the existing `status` field, with a comment explaining the two distinct questions).

### Step 2 — Created `backend/src/controllers/admin-subscription.controller.ts`

The file matches the brief verbatim except for one deviation (see Deviations below):

- `subscriptionFor(userId)` helper: looks up the user, returns a typed discriminated union `{ ok: true, ... } | { ok: false, status, message }` so TypeScript can narrow without ambiguity.
- `scheduleCancellation`: validates the date, calls `stripe.subscriptions.update` with `cancel_at`, then reconciles via `reconcileFromSubscription`.
- `cancelImmediately`: calls `stripe.subscriptions.cancel`, then calls `clearSubscription` to mark the account locally.

### Step 3 — Wired routes in `backend/src/routes/admin.routes.ts`

- Added import for `cancelImmediately` and `scheduleCancellation`.
- Added two `router.post` lines below the existing `router.get('/subscriptions', ...)` line; both sit under `router.use(authenticate, authorize('ADMIN'))`.

### Step 4 — Extended frontend admin API client (`frontend/lib/api/admin.ts`)

- Added five fields to `AdminSubscription`: `subscriptionStatus`, `isLive`, `currentPeriodEnd`, `cancelAt`, `canCancel`.
- Added `scheduleCancellation` and `cancelSubscriptionNow` methods to `adminService`, using the same `adminApiClient.post(..., ..., true)` pattern as `deactivateCoupon`.

### Step 5 — Extended the admin subscriptions table

- Added three headers after "Status": Billing, Renews, Actions.
- Added matching cells in the row renderer (Billing badge coloured by `isLive`, Renews showing `cancelAt` or `currentPeriodEnd`, Actions with Schedule / Cancel now buttons when `canCancel`).
- Bumped both `colSpan={7}` (loading row and empty row) to `colSpan={10}`.
- Added `handleSchedule` and `handleCancelNow` handlers next to `handleDeactivateCoupon`, using `window.prompt` / `window.confirm` as specified.

## Test commands and output

### Backend TypeScript

```
cd backend && npx tsc --noEmit
```
Exit 0 — no output.

### Backend tests

```
cd backend && npx vitest run
```

```
 ✓ src/utils/entitlements.test.ts (21 tests) 20ms
 ✓ src/utils/price-catalogue.test.ts (12 tests) 17ms
 ✓ src/utils/subscription-sync.test.ts (12 tests) 16ms
 ✓ src/utils/public-visibility.test.ts (7 tests) 16ms
 ✓ src/utils/pricing.test.ts (18 tests) 22ms
 ✓ src/utils/pricing-parity.test.ts (2 tests) 8ms

 Test Files  6 passed (6)
       Tests  72 passed (72)
```

### Frontend TypeScript

```
cd frontend && npx tsc --noEmit
```
Exit 0 — no output.

## Deviations from the brief

### Discriminated union pattern in `subscriptionFor`

The brief used `{ error: { status, message } } as const` and `'error' in found` to discriminate. TypeScript 5.9.3 (installed in this repo) does not narrow `found.error` to non-undefined after `'error' in found`, producing:

```
error TS18048: 'found.error' is possibly 'undefined'.
```

I replaced the pattern with an explicit typed union:

```ts
type SubscriptionFound =
  | { ok: true; user: { id: string; stripeSubscriptionId: string }; subscriptionId: string }
  | { ok: false; status: number; message: string };
```

and `if (!found.ok)` instead of `if ('error' in found)`. The runtime behaviour is identical; only the TypeScript representation changed. This is a narrower deviation than changing TypeScript config, and the brief itself noted "A `tsc` error on `subscriptions.cancel` means the SDK method is `del` on an older major — check before changing", implying adaptation for SDK/compiler differences is expected.

The `subscriptions.cancel` method is present in the installed Stripe SDK (confirmed in `SubscriptionsResource.d.ts`, line 2269).

## Concerns

None. All 72 tests pass, both TypeScript checks are clean, and every file the brief listed was modified.

## Commit

`2c942ac` — feat(admin): show billing status and schedule or force a cancellation
