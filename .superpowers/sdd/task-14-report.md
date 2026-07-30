# Task 14 Report: Rollout Backfill — Grandfather Existing Owners

## What Was Implemented

### Step 1: Database inspection (offline — cannot connect to Railway)

The brief requires running a diagnostic SELECT against the production Railway database before writing the backfill. Per the instructions ("Do NOT run the migration. Do NOT run any database migration or connect to any database"), no live database connection was made. The migration SQL was written based on the safe, conservative logic prescribed verbatim in the brief: grandfather only NURSERY_OWNER accounts that already have at least one `isApproved = true` nursery. This is the minimal set of accounts that are currently visible and would vanish without the backfill.

The brief itself acknowledges this situation: "If it is not obvious from the output which is which, stop and ask Matt before running anything." Since the instructions for this agent explicitly prohibit connecting to the database, the SQL was written using the brief's exact canonical form — which is already the most conservative possible query (only touches owners with approved nurseries). Demo/seed accounts with no approved nurseries are unaffected by definition.

**No `NOT IN` exclusion clause was added** because no database output was available to identify specific emails to exclude. The clause was deliberately omitted rather than inventing placeholder addresses, exactly as the brief directs: "If there are none to exclude, omit the clause entirely rather than inventing placeholders."

### Step 2: Migration file created

**File:** `backend/prisma/migrations/20260731000100_backfill_subscription_status/migration.sql`

This migration sorts after `20260731000000_add_subscription_columns` (which adds the `subscriptionStatus` column this UPDATE references). The directory name timestamp `20260731000100` is 60 seconds after `20260731000000`, guaranteeing correct application order.

### Step 3: Verification query (offline)

Verification SQL from the brief (to be run by hand before/after applying) was not executed here. It is reproduced in the concerns section for the operator's use.

### Step 4: TypeScript and test checks

Ran before committing:
- `cd backend && npx tsc --noEmit` — **clean (no output)**
- `npx vitest run` — **72/72 tests passed**
- `cd frontend && npx tsc --noEmit` — **clean (no output)**

### Step 5: Commit

Single commit with the migration file, staged with `git add` per the brief's instruction.

---

## Exact SQL Written

```sql
-- Backfill: subscriptionStatus defaults to 'none', which is not live, so
-- without this every pre-subscription owner's nurseries disappear from the
-- public site the moment PUBLIC_NURSERY_WHERE ships.
--
-- Grandfathers exactly the accounts that are already visible: owners with at
-- least one approved nursery. Anything unapproved stays at 'none' and stays
-- invisible, which it already was.
--
-- These accounts have no Stripe subscription behind them. They are marked
-- 'active' as a deliberate manual grant, not as a mirror of Stripe, and no
-- webhook will ever move them because stripeSubscriptionId is null.
UPDATE "users" u
SET "subscriptionStatus" = 'active'
WHERE u.role = 'NURSERY_OWNER'
  AND u."subscriptionStatus" = 'none'
  AND EXISTS (
    SELECT 1 FROM "nurseries" n
    WHERE n."ownerId" = u.id AND n."isApproved" = true
  );
```

**Table names verified against schema.prisma `@@map` directives:**
- `User` model → `"users"` ✓
- `Nursery` model → `"nurseries"` ✓

**Column names verified against schema.prisma and migration `20260731000000_add_subscription_columns`:**
- `"subscriptionStatus"` — added by the preceding migration, camelCase, double-quoted ✓
- `"isApproved"` — on `Nursery` model, camelCase, double-quoted ✓
- `"ownerId"` — on `Nursery` model, camelCase, double-quoted ✓
- `role` — unquoted because it is an enum column with no casing ambiguity; value `'NURSERY_OWNER'` is a Postgres enum literal ✓

---

## Test Commands and Output

```
$ cd backend && npx tsc --noEmit
(no output — clean)

$ npx vitest run
 RUN  v2.1.9 C:/Users/Tayyab Anwar/Downloads/mathew-main/repo-push/backend

 ✓ src/utils/price-catalogue.test.ts (12 tests) 17ms
 ✓ src/utils/entitlements.test.ts (21 tests) 16ms
 ✓ src/utils/subscription-sync.test.ts (12 tests) 15ms
 ✓ src/utils/public-visibility.test.ts (7 tests) 14ms
 ✓ src/utils/pricing.test.ts (18 tests) 26ms
 ✓ src/utils/pricing-parity.test.ts (2 tests) 5ms

 Test Files  6 passed (6)
       Tests  72 passed (72)
    Start at  20:25:29
    Duration  2.34s

$ cd frontend && npx tsc --noEmit
(no output — clean)
```

---

## Deviations from Brief

**Step 1 (database inspection) was skipped.** The operator instructions explicitly prohibit connecting to any database. The migration was written using the brief's exact canonical SQL, which is safe by construction: it only touches `NURSERY_OWNER` accounts with at least one approved nursery, which is exactly the set that is currently visible. Demo accounts with no approved nurseries are not affected regardless of email address.

**Consequence:** If there are seed/demo `NURSERY_OWNER` accounts that happen to have an approved nursery attached, this migration would grandfather them. Matt (the operator) must run the diagnostic SELECT from Step 1 of the brief against Railway before applying the migration, and add a `NOT IN` exclusion if needed. The migration file as written is safe to apply as-is only if the operator has confirmed there are no such accounts.

---

## Concerns

1. **Operator must run Step 1 before applying.** The brief is explicit that Step 1's diagnostic SELECT must be run and reviewed before applying. This agent could not do that. Matt should run:

   ```sql
   SELECT u.id, u.email, u.role, u."planTier", u."paidNurseryCount",
          u."stripeSubscriptionId", u."subscriptionStatus",
          COUNT(n.id) AS nurseries
   FROM "users" u
   LEFT JOIN "nurseries" n ON n."ownerId" = u.id
   WHERE u.role IN ('ADMIN', 'NURSERY_OWNER')
   GROUP BY u.id
   ORDER BY nurseries DESC;
   ```

   If any rows are demo/seed accounts with approved nurseries, add `AND u.email NOT IN ('...')` to the migration before applying.

2. **Window between migrations.** Between applying `20260731000000_add_subscription_columns` and `20260731000100_backfill_subscription_status`, every non-ADMIN listing is hidden. The brief acknowledges this: "Keep the gap short."

3. **Verification counts.** Before and after applying, Matt should run:

   ```sql
   -- After backfill, this should equal the "before" approved total
   SELECT COUNT(*) FROM "nurseries" n
   JOIN "users" u ON u.id = n."ownerId"
   WHERE n."isApproved" = true
     AND (u.role = 'ADMIN' OR u."subscriptionStatus" IN ('active','trialing','past_due'));

   -- Baseline
   SELECT COUNT(*) FROM "nurseries" WHERE "isApproved" = true;
   ```

4. **No `stripeSubscriptionId` set.** Grandfathered owners have `stripeSubscriptionId = NULL`. The webhook syncs status only when it finds a matching subscription ID, so these accounts will remain `'active'` indefinitely unless an admin manually changes them. This is intentional per the brief ("no webhook will ever move them because stripeSubscriptionId is null") but means there is no automated enforcement for grandfathered accounts.

---

## Files Created

- `backend/prisma/migrations/20260731000100_backfill_subscription_status/migration.sql`
- `.superpowers/sdd/task-14-report.md` (this file)
