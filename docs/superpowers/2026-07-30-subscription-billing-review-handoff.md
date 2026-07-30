# Recurring Subscriptions — Review Handoff

**Reviewer brief.** Everything below is unpushed work on `main`, 24 commits from
`a0eaeb5` to `2a47ffa`. Spec: `docs/superpowers/specs/2026-07-30-subscription-billing-design.md`.
Plan: `docs/superpowers/plans/2026-07-30-recurring-subscriptions.md`.

**Status:** 76/76 backend tests pass, `tsc --noEmit` clean on backend and
frontend, both migrations applied to the Railway database (which is empty —
fresh DB, so the backfill matched 0 rows). Nothing pushed. Stripe test-mode
smoke test not yet run.

---

## What this changes, in one sentence

Nursery plan checkout moved from `mode: 'payment'` one-time charges to real
recurring Stripe subscriptions, and the site now hides listings whose owner is
not paying.

---

## The four load-bearing ideas

**1. The subscription is the plan.** Nothing about what an account bought is
stored anywhere the client can influence. `readSubscription()` in
`backend/src/utils/subscription-sync.ts` reads the tier off the price's
`lookup_key` and the nursery count off the item's `quantity`. The old
`planFromMetadata` path is deleted; checkout session metadata is no longer
consulted anywhere.

**2. Prices are immutable and versioned.** `priceLookupKey()` produces
`mathew_{tier}_{billing}_v{PRICE_VERSION}` (`PRICE_VERSION = 1`, in
`backend/src/utils/pricing.ts:71`). `ensurePlanPrices()` in
`backend/src/utils/stripe.ts` reconciles the four catalogue Prices against
`pricing.ts` and **throws `PriceCatalogueError` rather than repairing** a
mismatch — a Stripe Price cannot be edited once created, so the only honest
repair is a version bump, which is a human decision. Blocking checkout is the
safe failure; charging the wrong amount is not.

**3. Webhooks re-fetch, never trust the payload.** `reconcileFromSubscription()`
takes only a subscription id, re-retrieves it from Stripe, and writes the
result. Stripe does not guarantee event ordering, so a stale
`subscription.updated` payload could otherwise overwrite a newer one. Costs one
extra API call per event; every write is current truth by construction.

**4. Two questions, two columns.** `entitlements.ts` keeps them apart:
`features()` reads `planTier` (what is unlocked), `allowance()` reads
`paidNurseryCount` (how many nurseries may exist), and `isLive()` reads
`subscriptionStatus` (is it paid for). "Group" is derived from the count, never
stored, so it cannot contradict it.

---

## Things a reviewer should specifically check

These are the assumptions most likely to be wrong, and where I'd focus.

**`current_period_end` lives on the subscription *item*.** Under API version
`2026-02-25.clover` Stripe moved it off the Subscription object.
`subscription-sync.ts` reads `item.current_period_end`. If this is wrong, the
dashboard's renewal date renders blank and nothing else fails loudly. **Only a
live test-mode call can confirm this** — no unit test can.

**Stripe silently resets `quantity` to 1 when an item's `price` changes.** Every
`subscriptions.update` call in `stripe.controller.ts` therefore passes
`quantity` explicitly, even when the quantity is not changing. Verify no update
path omits it.

**`parseLookupKey` must tolerate any version number.** Historic invoices carry
older versions. Check that it does not hard-match `_v1`.

**`past_due` counts as live.** `LIVE_SUBSCRIPTION_STATUSES =
['active','trialing','past_due']`. This is deliberate — Stripe's card retries
run about three weeks, and an expired card should not pull a nursery off the
site before anyone can fix it. Confirm you agree that's the right call.

**`invoice_creation` is invalid in subscription mode.** It was present under the
old `mode: 'payment'` code. Confirm it's gone from the session params.

**TOCTOU on the nursery allowance.** `createNursery` uses
`SELECT ... FOR UPDATE` inside `prisma.$transaction`. Check the lock actually
covers the read that the decision is made from, not just the write.

**Prisma `@@map` names in raw SQL.** `User` → `users`, `Nursery` → `nurseries`,
`Group` → `groups`. Any raw query using the model names would silently fail.

---

## Public visibility gate (the highest-blast-radius change)

`backend/src/utils/public-visibility.ts` exports two filters, both built from
the same `PAYING_OWNER` clause (`role: ADMIN` OR live subscription status):

- `PUBLIC_NURSERY_WHERE` — `isApproved: true` + paying owner
- `PUBLIC_GROUP_WHERE` — `isActive: true` + paying owner (groups have no
  `isApproved` field)

Applied across `user.nursery.controller.ts` to five nursery queries and five
group queries.

**One deliberate exception:** `searchNurseries` omits the nursery filter. It
backs the "leave a review" flow, and a parent must be able to review a nursery
they attended even if the owner stopped paying. I verified the only caller
(`frontend/components/landing-page/review-form.tsx`) reads `data.nurseries` and
discards `data.groups`, so gating the group half of that same handler does not
break the review flow. **Worth re-verifying independently.**

**Pre-existing bug fixed in passing:** `getNurseryBySlug` used `findUnique`,
which cannot take a relation filter, so unapproved nurseries were readable by
slug. Now `findFirst`. `public-visibility.test.ts` asserts the `findUnique`
shape never comes back.

**The guard test is source-text based.** `public-visibility.test.ts` reads the
controller off disk and asserts every block that queries nurseries mentions the
shared filter. It counts occurrences per block (`FILTER_SITES`) rather than
checking mere presence, because `searchByCity` filters in two places and a
presence check would pass with one of them deleted. It also asserts it cannot
pass vacuously, and that the allowlist entry still exists. This is an unusual
test style — judge whether it earns its keep.

---

## Migrations (already applied)

```
20260731000000_add_subscription_columns
20260731000100_backfill_subscription_status
```

The first adds seven columns to `users` (`planTier`, `paidNurseryCount`,
`stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`,
`currentPeriodEnd`, `cancelAt`), plus the `processed_checkout_sessions` ledger
table and two indexes.

The second grandfathers existing owners so live listings survive the new gate:

```sql
UPDATE "users" u
SET "subscriptionStatus" = 'active'
WHERE u.role = 'NURSERY_OWNER'
  AND u."subscriptionStatus" = 'none'
  AND EXISTS (SELECT 1 FROM "nurseries" n
              WHERE n."ownerId" = u.id AND n."isApproved" = true);
```

**Sequencing matters on a populated database:** between migration 1 and
migration 2, every non-ADMIN listing is dark. They must be applied back to back.
On this fresh DB it was moot — 0 rows matched.

**Railway does not auto-migrate.** `backend/package.json` has no
`prisma migrate deploy` in `build` or `start`. Migrate-then-push is mandatory.

---

## Idempotency

`processed_checkout_sessions` has the Stripe session id as its primary key. The
insert is what makes reconciliation idempotent: the webhook and the success
redirect race on it, and re-posting an old session id after a downgrade cannot
re-apply the larger allowance. Check that the insert genuinely precedes the
account write and that a duplicate-key error is treated as "already done"
rather than an error.

---

## Frontend

**`frontend/lib/api/client.ts` throws `ApiException` with a `.code` on any
non-2xx response.** Error codes arrive in `catch`, not in an `else` branch. A
reviewer flagged this backwards during the process; the fix in
`upgrade/page.tsx` keys off `err?.code`.

**Upgrade page** (`frontend/app/nursery-dashboard/upgrade/page.tsx`) now shows a
real prorated amount from `invoices.createPreview` and confirms in place instead
of redirecting to Stripe. Two things to check:

- `previewFor` freezes the selection the preview was priced for. Confirm charges
  what the screen quoted — reading the live pickers again would let a later
  selection be charged at an earlier price.
- If the subscription lapsed between pricing and confirming, `applyChange`
  returns `REQUIRES_CHECKOUT` and the page falls through to Stripe Checkout
  rather than dead-ending on an error. There is no card on file to charge in
  that state.

Explanatory copy has three variants, in precedence order: interval change → tier
change → quantity change. Verify the precedence reads correctly for a combined
change (e.g. monthly→annual *and* standard→platinum).

---

## Known gaps

- **Task 15 not done.** The Stripe test-mode smoke test is the only thing that
  can confirm the two runtime assumptions above (`current_period_end` location,
  `parseLookupKey` matching real returned keys). Needs a registered owner
  account first, since the DB is empty.
- **Invoice history is not paginated** — fetches the full list client-side.
  Backlogged by explicit decision, not an oversight.
- **No DB or Stripe test harness.** Every test covers pure functions or asserts
  against file contents read off disk. Nothing exercises a real query or a real
  Stripe call. This is the largest structural weakness in the work.

---

## File map

| Area | Files |
|---|---|
| Pricing / catalogue | `backend/src/utils/pricing.ts`, `stripe.ts`, `price-catalogue.test.ts` |
| Subscription reads | `backend/src/utils/subscription-sync.ts` (+ test) |
| Entitlements | `backend/src/utils/entitlements.ts` (+ test), `middleware/entitlement.ts` |
| Public gating | `backend/src/utils/public-visibility.ts` (+ test), `controllers/user.nursery.controller.ts` |
| Checkout / webhook | `backend/src/controllers/stripe.controller.ts`, `routes/stripe.routes.ts` |
| Admin | `backend/src/controllers/admin-subscription.controller.ts`, `payment-history.controller.ts` |
| Frontend | `frontend/app/nursery-dashboard/upgrade/page.tsx`, `components/.../subscriptions.tsx`, `lib/api/{auth,admin,nursery}.ts` |
