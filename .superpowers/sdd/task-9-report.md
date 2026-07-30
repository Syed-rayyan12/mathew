# Task 9 Report: One shared filter for every public nursery query

## What was implemented, step by step

### Step 1 — Failing test created
`backend/src/utils/public-visibility.test.ts` written verbatim from the brief.
Seven assertions across two `describe` blocks:
- `PUBLIC_NURSERY_WHERE` shape (isApproved, owner.OR with ADMIN + live statuses)
- Controller has ≥4 nursery queries
- Every nursery query (except the allowlisted `searchNurseries`) uses `PUBLIC_NURSERY_WHERE`
- No inline `nurseries: { where: { isApproved` count blocks remain
- Allowlist cannot rot (each entry must still exist in the file)
- `getNurseryBySlug` must not use `findUnique({ where: { slug }` alone

### Step 2 — Confirmed test failure
Running `npx vitest run src/utils/public-visibility.test.ts` produced:
```
Error: Failed to load url ./public-visibility … Does the file exist?
```
Expected failure (module not yet created).

### Step 3 — Implemented `backend/src/utils/public-visibility.ts`
Created the file exactly as specified in the brief. Imports `LIVE_SUBSCRIPTION_STATUSES` from `./entitlements` and exports:
```ts
export const PUBLIC_NURSERY_WHERE = {
  isApproved: true,
  owner: {
    OR: [
      { role: 'ADMIN' as const },
      { subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
    ],
  },
};
```

### Step 4 — Applied the filter at five call sites in `user.nursery.controller.ts`

Added import at the top of the file:
```ts
import { PUBLIC_NURSERY_WHERE } from '../utils/public-visibility';
```

**4a. `autocompleteSearch`** — replaced `isApproved: true,` with `...PUBLIC_NURSERY_WHERE,` in the nursery `findMany` where clause, preserving the `OR` array for name/city/town search terms.

**4b. `searchByCity` — group count** — replaced the inline `nurseries: { where: { isApproved: true } }` inside `_count.select` with `nurseries: { where: PUBLIC_NURSERY_WHERE }`.

**4c. `searchByCity` — nursery list** — replaced `isApproved: true,` with `...PUBLIC_NURSERY_WHERE,` in the `findMany` where clause, preserving the `city` equality filter.

**4d. `getAllNurseries`** — replaced `isApproved: true,` with `...PUBLIC_NURSERY_WHERE,` in the shared `where` object. The `prisma.nursery.count({ where })` further down reuses the same object, so it is covered automatically by this one change.

**4e. `getNurseryBySlug`** — changed `prisma.nursery.findUnique({ where: { slug } …` to `prisma.nursery.findFirst({ where: { slug, ...PUBLIC_NURSERY_WHERE } …`. `findUnique` cannot accept a relation filter (`owner`), so `findFirst` is required. This also closes the pre-existing gap where any unapproved nursery was reachable by slug.

**4f. `searchNurseries`** — left exactly as-is. It is the documented exception in `ALLOWED_WITHOUT_FILTER`: a parent reviewing a nursery they attended must be able to find it regardless of the owner's subscription status.

### Step 5 — Tests pass

```
npx vitest run
 ✓ src/utils/entitlements.test.ts (21 tests)
 ✓ src/utils/price-catalogue.test.ts (12 tests)
 ✓ src/utils/subscription-sync.test.ts (12 tests)
 ✓ src/utils/public-visibility.test.ts (7 tests)
 ✓ src/utils/pricing.test.ts (18 tests)
 ✓ src/utils/pricing-parity.test.ts (2 tests)

Test Files  6 passed (6)
      Tests  72 passed (72)
```

```
npx tsc --noEmit
(silent — no errors)
```

## Deviations from the brief

None. Every step followed the brief exactly, including function names, the allowlisted exception, and the `findUnique` → `findFirst` change.

## Concerns

None. The `getAllNurseries` `where` object is later mutated (city, search, ageRange, careTypes, etc. are added to it). The spread `...PUBLIC_NURSERY_WHERE` copies `isApproved` and `owner` at the top level but none of those keys conflict with the later dynamic keys, so mutation is safe. The `owner` key added by the spread is never touched again by the dynamic filters.

The `findFirst` change for `getNurseryBySlug` uses `(prisma as any)` which was already in place, so it is not a regression.
