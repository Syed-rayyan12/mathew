# Final Fixes Report

Date: 2026-07-30

## Fix 1 — Gate group pages on the owner's subscription

### Changes made

**`backend/src/utils/public-visibility.ts`**

- Factored the shared owner condition into a module-private `PAYING_OWNER` constant (not exported — it is an implementation detail).
- `PUBLIC_NURSERY_WHERE` continues to export with exactly the same shape: `{ isApproved: true, owner: { OR: [...] } }`. The existing test assertions against `.isApproved` and `.owner.OR` pass unchanged.
- Added new export `PUBLIC_GROUP_WHERE`: `{ isActive: true, owner: PAYING_OWNER }`. Groups have no `isApproved` field, so only `isActive` and the owner guard apply. The ADMIN arm is preserved exactly as it is in the nursery filter.

**`backend/src/controllers/user.nursery.controller.ts`**

Import updated to: `import { PUBLIC_NURSERY_WHERE, PUBLIC_GROUP_WHERE } from '../utils/public-visibility';`

### Group queries found and disposition

| Exported block | Query | Disposition | Reason |
|---|---|---|---|
| `getAllGroups` | `prisma.group.findMany` | **Filtered** | Public listing page — lapsed groups must not appear |
| `getGroupBySlug` | `prisma.group.findFirst` | **Filtered** | Public detail page — the exact scenario described in the finding |
| `autocompleteSearch` | `prisma.group.findMany` | **Filtered** | Hero banner search — surfaces group pages to parents; a lapsed group should not surface |
| `searchNurseries` | `prisma.group.findMany` | **Filtered** | Review-flow search — the nursery query is deliberately unfiltered (parents must be able to review any nursery), but the groups query is incidental to that exemption and a lapsed group page is no reason to show the group here |
| `searchByCity` | `prisma.group.findMany` | **Filtered** | Hero city results — same rationale as `getAllGroups` |
| `admin.controller.ts` (all group queries) | multiple | **Skipped** | Admin-only controller; admin sees everything regardless of subscription |
| `nursery-dashboard.controller.ts` (all group queries) | multiple | **Skipped** | Owner-scoped dashboard; the owner always sees their own group |
| `auth.controller.ts` (group updateMany / deleteMany) | mutations | **Skipped** | Account lifecycle mutations, not public reads |
| `stripe.controller.ts` (`prisma.group.findFirst`) | `findFirst` | **Skipped** | Checks whether an owner's nurseries form a group for billing purposes; owner-scoped, not public |

There were no `prisma.group.` calls in: `article`, `contact`, `coupon`, `job`, `notification`, `nursery.job`, `payment-history`, `recently-viewed`, `review`, `shortlist`, `team-member`, `upload` controllers.

### `searchByCity` multi-filter note

`searchByCity` now contains `PUBLIC_GROUP_WHERE` once (group `findMany` where clause) and `PUBLIC_NURSERY_WHERE` twice (the `_count.nurseries` nested where, plus the nursery `findMany` where). The existing `FILTER_SITES` entry `{ searchByCity: 2 }` continues to cover the nursery side correctly. The new group test checks for at least one `PUBLIC_GROUP_WHERE` mention per block, which is also correct since `searchByCity` filters groups in exactly one place.

### Tests added (`backend/src/utils/public-visibility.test.ts`)

Three new test cases in two new describe blocks:

1. `PUBLIC_GROUP_WHERE` — gates on `isActive: true`
2. `PUBLIC_GROUP_WHERE` — `owner.OR` equals `[{ role: 'ADMIN' }, { subscriptionStatus: { in: [...] } }]`
3. `user.nursery.controller.ts — group queries` — finds at least 4 blocks querying groups (vacuity guard)
4. `user.nursery.controller.ts — group queries` — every block querying groups uses `PUBLIC_GROUP_WHERE`

Total tests: 76 (was 72 at HEAD).

---

## Fix 2 — Distinguish tier change from quantity change in upgrade confirmation copy

### Change made

**`frontend/app/nursery-dashboard/upgrade/page.tsx`**

The explanatory paragraph in the `status === 'confirming'` branch.

### How the distinction is derived

- `isPlatinum` is derived from `entitlements?.planTier === 'platinum'` and is in scope at the confirming screen.
- When `!isPlatinum`, the customer is on Standard and this upgrade moves them to Platinum — a tier change.
- When `isPlatinum`, they already have Platinum features and are adding nurseries — a quantity-only change.
- `preview.intervalChanges` (from the server) signals a billing-cycle restart, which takes precedence over both because it affects what the charge covers.

### Final copy for all three variants

**Interval change (billing period restarts — highest precedence):**
> Changing your billing period restarts your billing cycle today, so this charge covers a full new period less credit for time you have already paid for.

**Tier change (Standard → Platinum):**
> Your Platinum features are available immediately. Today's charge covers the rest of your current billing period at the new rate. Your renewal date does not change.

**Quantity-only change (more nurseries at Platinum):**
> Today's charge covers the rest of your current billing period. Your renewal date does not change.

---

## Test output

```
 RUN  v2.1.9

 ✓ src/utils/price-catalogue.test.ts (12 tests)
 ✓ src/utils/entitlements.test.ts (21 tests)
 ✓ src/utils/public-visibility.test.ts (11 tests)
 ✓ src/utils/pricing.test.ts (18 tests)
 ✓ src/utils/pricing-parity.test.ts (2 tests)
 ✓ src/utils/subscription-sync.test.ts (12 tests)

 Test Files  6 passed (6)
       Tests  76 passed (76)
    Start at  21:11:57
    Duration  2.26s
```

Backend `tsc --noEmit`: clean.
Frontend `tsc --noEmit`: clean.

---

## Concerns

**One minor concern:** The `PAYING_OWNER` constant in `public-visibility.ts` is not exported. If a future controller were to need the same owner condition without the model-level wrapper (e.g. a direct user query), it would need to duplicate it or the export would need to be added then. This is intentional for now — the test coverage is on the exported fragments, not on the internal constant, so a future author cannot accidentally bypass the wrapper.

**One structural note:** The `searchNurseries` groups query is now gated even though its sibling nursery query deliberately is not. This is the right call — the nursery-exemption rationale (a parent must be able to review any nursery they attended) does not extend to group pages, which are a presentation layer over nurseries rather than a subject of review themselves.

**No database migration required.** All changes are query-time filters. Existing data is unaffected.
