# Task 13 Report: Upgrade page confirmation screen with real prorated numbers

## What was implemented

### Step 1 — Add interfaces and methods to `frontend/lib/api/auth.ts`

Added two TypeScript interfaces (`ChangePreview` and `ChangeResult`) immediately after the existing `UpgradeResult` interface. Then added two methods to `authService` immediately above `createUpgradeSession`:

- `previewChange(planTier, billingPeriod, nurseryCount)` — POSTs to `/stripe/preview-change` and returns `ApiResponse<ChangePreview>`.
- `applyChange(planTier, billingPeriod, nurseryCount)` — POSTs to `/stripe/apply-change`, returns `ApiResponse<ChangeResult>`, and on success mirrors `planTier`/`paidNurseryCount` into both `nurseryUser` and `user` localStorage keys (matching the same pattern used by `verifyUpgradeSession`).

### Step 2 — Widen import and add `preview` state in `frontend/app/nursery-dashboard/upgrade/page.tsx`

- Import widened from `{ authService }` to `{ authService, type ChangePreview }`.
- Status union type extended to include `'confirming'`.
- `preview` state (`ChangePreview | null`) added below the status declaration.

### Step 3 — Split `handleUpgrade` into preview and confirm

The original `handleUpgrade` function (which called `createUpgradeSession` directly) was replaced with two functions:

- `handleUpgrade` — now calls `previewChange` first. If `requiresCheckout` is true, falls through to `createUpgradeSession` (the lapsed/never-subscribed path). Otherwise sets `preview` and transitions to `'confirming'` status.
- `handleConfirm` — new function that calls `applyChange`, then on success calls the frontend `planLabel(tier, count)` from `@/lib/pricing` (not the backend version) to set `newPlanLabel` and transitions to `'success'`.

### Step 4 — Render the confirmation screen

Inserted the `'confirming'` branch immediately above the existing `'success'` branch. The panel shows:
- "Due today" — Stripe's prorated `amountDueNowPence` formatted as GBP.
- "Then per month/year" — `nextRenewalPence` (the sticker price for the new plan).
- "Next payment" date — only shown when `nextRenewalDate` is non-null (i.e. when the billing interval does not change).
- Explanatory copy that varies between same-interval and interval-change cases.
- Confirm button with `handleConfirm` and a "Back" button that resets to idle.

### Step 5 — Update CTA wording on the idle screen

- Loading label changed from "Redirecting to payment…" to "Checking your price…".
- Resting label changed from "Upgrade Now — £X/mo" to "Review upgrade — £X/mo".

## Test commands and output

### Backend TypeScript check
```
cd backend && npx tsc --noEmit
```
Output: (no output — zero errors)

### Backend unit tests
```
cd backend && npx vitest run
```
Output:
```
✓ src/utils/entitlements.test.ts (21 tests)
✓ src/utils/price-catalogue.test.ts (12 tests)
✓ src/utils/subscription-sync.test.ts (12 tests)
✓ src/utils/public-visibility.test.ts (7 tests)
✓ src/utils/pricing.test.ts (18 tests)
✓ src/utils/pricing-parity.test.ts (2 tests)

Test Files  6 passed (6)
      Tests  72 passed (72)
```

### Frontend TypeScript check
```
cd frontend && npx tsc --noEmit
```
Output: (no output — zero errors)

### Frontend build
Per the task brief: `npm run build` on the frontend requires live environment variables not available in this environment and was NOT run. The brief explicitly notes this substitution. The TypeScript check (`npx tsc --noEmit`) passes with zero errors, which is the functional equivalent for type safety.

## Deviations from the brief

### Backend `planLabel` signature differs from brief assumption

The brief notes that `planLabel()` in `backend/src/utils/entitlements.ts` is the single source of plan wording. The backend function takes a `PlanAccount` object (`{ planTier, paidNurseryCount }`), not two separate args. However, the frontend already has its own `planLabel(tier, nurseryCount)` from `@/lib/pricing` that mirrors the backend. The `handleConfirm` function correctly uses the frontend version (already imported at line 10), which is what the brief's code sample also does. No deviation in the actual code.

### Response shape confirmation

After reading the actual backend handlers:

- `previewChange` returns `{ success: true, data: { requiresCheckout, amountDueNowPence, nextRenewalPence, nextRenewalDate, intervalChanges, currency, targetLabel } }` — exactly matches `ChangePreview`.
- `applyChange` returns `{ success: true, data: { planTier, paidNurseryCount, subscriptionStatus } }` — exactly matches `ChangeResult`.

The `amountDueNowPence` field in the backend is `preview.amount_due` from Stripe (pence integer). The `nextRenewalPence` is `target.totalPence` from the local pricing catalogue. Both are pence integers, consistent with the frontend's `formatGbp` dividing by 100.

The `requiresCheckout: true` branch in `previewChange` still populates `amountDueNowPence` and `nextRenewalPence` with the sticker price, but the frontend ignores those values and redirects to Checkout instead — consistent with the brief.

## Concerns

None. All type checks and tests pass. The implementation is a faithful translation of the brief with no surprises from the backend shape inspection.
