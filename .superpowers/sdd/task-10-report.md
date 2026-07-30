# Task 10 Report: Dashboard gates ask about billing too

## What was implemented

### Step 1 — `requireFeature` now checks subscription liveness

File: `backend/src/middleware/entitlement.ts`

- Added `isLive` to the import from `../utils/entitlements`.
- Widened the Prisma select in `requireFeature` to include `subscriptionStatus` (needed by `isLive()`).
- Inserted an `if (!isLive(account))` guard between the `!account` guard and the `features(account)[feature]` check, returning HTTP 403 with `code: 'SUBSCRIPTION_INACTIVE'`. The `ADMIN` early-return above it is untouched, so admins pass through without a subscription.

### Step 2 — Entitlements endpoint reports billing state

File: `backend/src/controllers/nursery-dashboard.controller.ts`

- Added `isLive` to the import from `../utils/entitlements`.
- Widened the Prisma select in `getMyEntitlements` to also fetch `subscriptionStatus`, `currentPeriodEnd`, and `cancelAt`.
- Extended the JSON response with: `subscriptionStatus`, `isLive`, `currentPeriodEnd`, `cancelAt`.

### Step 3 — Frontend type widened

File: `frontend/lib/api/nursery.ts`

- Added four new fields to the `Entitlements` interface: `subscriptionStatus: string`, `isLive: boolean`, `currentPeriodEnd: string | null`, `cancelAt: string | null`, with JSDoc matching the brief.

## Test commands and output

```
cd backend && npx tsc --noEmit
# (no output — clean)

cd backend && npx vitest run
# Test Files  6 passed (6)
#       Tests 72 passed (72)

cd frontend && npx tsc --noEmit
# (no output — clean)
```

All 72 backend tests passed; both TypeScript compilations were error-free.

## Deviations from the brief

None. Every code snippet and ordering instruction was followed verbatim. The entitlements-endpoint select was located by the symbol `getMyEntitlements` rather than by the approximate line numbers in the brief (Tasks 1-9 shifted the file), as instructed.

## Concerns

None. The implementation is straightforward additive changes with no behavioural risk to existing passing tests.
