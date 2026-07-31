# Task 10 Report: Frontend UI — paywall card, swap dialog, status strip, public banner

## Status: COMPLETE

## Commit SHA: 4498463

## Files changed

### Created
- `frontend/components/nursery-dashboard-panel/jobs-paywall-card.tsx`
  - Shows "Platinum Plan Required" lock when `canPurchaseAddon` is false
  - Shows the £5.99/mo add-on offer card with checkout CTA when `canPurchaseAddon` is true
  - Includes comparison link to Platinum upgrade
  - Calls `nurseryDashboardService.jobsAddonCheckout()` on button click

- `frontend/components/nursery-dashboard-panel/swap-active-job-dialog.tsx`
  - Modal dialog explaining the one-live-advert limit
  - Shows which job will be taken offline
  - Confirm button triggers `onConfirm(activeJobId)` callback

### Modified
- `frontend/components/nursery-dashboard-panel/nursery-job-management.tsx`
  - Added imports: `nurseryDashboardService`, `JobsPaywallCard`, `SwapActiveJobDialog`
  - Removed unused `Lock` icon import
  - Updated `usePlanFeatures` destructuring to include `jobsAddon`, `activeJobLimit`, `refresh: refreshPlan`
  - Added `swapDialog` state for tracking pending swap
  - Added `useEffect` to verify `addon_session` URL param on return from Stripe checkout
  - Replaced old inline paywall block with `<JobsPaywallCard canPurchaseAddon={jobsAddon.canPurchase} />`
  - Added add-on status strip after Stats grid (shows active status, renewal/end date, cancel button)
  - Added `replaceActiveJobId` and `onLimitHit` props to `JobFormModalProps`
  - Updated `handleSubmit` to include `replaceActiveJobId` in payload and detect `ACTIVE_JOB_LIMIT` response
  - Added `SwapActiveJobDialog` render with confirm handler that re-submits with `replaceActiveJobId`
  - Wired `onLimitHit` on `JobFormModal` to set swap dialog state

- `frontend/components/landing-page/jobs-content.tsx`
  - Added imports: `Link` from `next/link`, `JOBS_ADDON_MONTHLY_PENCE` and `formatGbp` from `@/lib/pricing`
  - Added nursery-owner recruitment banner before the job cards grid showing "Advertise your vacancy here from £5.99/mo" with link to `/nursery-dashboard/jobs`

## TypeScript
`tsc --noEmit` passed with zero errors.

## Deviations from brief
None. All four steps implemented as specified.
