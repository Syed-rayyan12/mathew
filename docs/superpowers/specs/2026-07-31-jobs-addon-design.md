# Jobs add-on: £5.99/mo job posting for Single Standard

Date: 2026-07-31
Status: approved, not yet implemented
Builds on 2026-07-30-single-group-plans-design.md

## Problem

Job posting is a Platinum feature. A Single Standard owner who wants to
advertise one vacancy has exactly one route: upgrade from £23.95 to £38.60/mo
and buy five other features they did not ask for. Most will not, so the
vacancy is never advertised and the platform earns nothing.

Today that owner hits a dead end. `nursery-job-management.tsx:320-340` renders
a "Platinum Plan Required" card whose only action is a link to the upgrade
page. The intent to post a job is captured and then discarded.

This adds a paid add-on that unlocks job posting alone, at £5.99/mo on a
three-month minimum, capped at **one live advert at a time**. The cap is what
keeps it from cannibalising Platinum: a nursery with a single vacancy is served
by the add-on, a nursery recruiting continuously still needs Platinum.

## The product

| | Single Standard | + Jobs add-on | Single Platinum |
|---|---|---|---|
| Price / month | £23.95 | £23.95 + £5.99 | £38.60 |
| Create job adverts | no | unlimited | unlimited |
| **Live at once** | 0 | **1** | unlimited |
| Receive applications | no | yes | yes |
| Video, team, analytics, review moderation, priority placement | no | **no** | yes |
| Minimum term | none | 3 months | none |

Eligibility: a live subscription on `planTier: 'standard'`. Standard is
single-nursery by construction — `quote()` rejects a Standard group — so
"single nursery on Standard" needs no separate check. Platinum accounts cannot
buy it because they already have the feature, unmetered.

## Decisions

**£5.99 monthly, recurring, with the first three payments locked in.** Not
£17.97 up front. The subscription runs indefinitely at £5.99/mo; a cancellation
requested before the third payment takes effect at the end of month three
rather than immediately. After that it is cancel-anytime.

**The add-on is its own Stripe subscription**, not a second line item on the
plan. Rationale in "Why a separate subscription" below.

**Upgrading to Platinum cancels the add-on immediately and waives the
remaining commitment.** No credit is issued. The customer ends up with strictly
more than they had, so there is nothing to make good, and billing someone
£5.99 for a feature their new £38.60 plan already includes is a support ticket
in waiting.

**Publishing a second advert prompts to swap, and the swap is explicit.** The
API refuses to take an advert down unless the request names it.

**When the add-on ends, the advert goes dark and nothing is deleted.** Jobs,
drafts and received applications stay readable in the dashboard. Withholding
applications the owner already paid to receive would be punitive, and the
"advert disappears, data stays" behaviour already matches how a lapsed nursery
listing works.

## Why a separate subscription

Three places currently encode "one subscription, one item, and that item is the
plan":

- `subscription-sync.ts:50` — `readSubscription()` throws `SubscriptionShapeError`
  unless the subscription has exactly one item.
- `subscription-sync.ts:199` — a second **live** subscription on an account is
  treated as a duplicate and one of the two is cancelled.
- `entitlements.ts:86` — every feature, jobs included, derives from
  `planTier === 'platinum'`.

The alternative — adding the add-on as a second line item on the plan
subscription — buys one invoice and one billing cycle, and the add-on would die
with the plan automatically. It costs relaxing the one-item invariant in
`readSubscription()`, which is the single function every billing write flows
through, and entangling the add-on with `previewChange`/`applyChange`, which
build item arrays and pin proration timestamps. The three-month lock also
becomes hand-rolled, because an item cannot be scheduled for cancellation — it
can only be removed.

A separate subscription leaves all three of the above untouched. The
three-month lock is native (`cancel_at` on a subscription). The cost is a
second charge on the customer's statement and a webhook branch. For a £5.99
add-on, that is the correct trade.

### The guard that makes it safe

`readSubscription()` must never see an add-on subscription, and the add-on
reader must never see a plan subscription. Both directions fail loudly rather
than silently:

- `LOOKUP_KEY_RE` (`pricing.ts:124`) is `^mathew_(standard|platinum)_...`, which
  cannot match `mathew_jobs_addon_monthly_v1`. If an add-on subscription reaches
  `readSubscription()`, `parseLookupKey` returns null and it throws — it is
  never mistaken for a Standard plan and never downgrades a customer.
- `readJobsAddonSubscription()` symmetrically throws on a plan lookup key, so a
  plan subscription can never be written into the add-on columns.

## Data model

Five columns on `User`, mirroring the existing plan columns. Stripe stays the
source of truth; these are a local mirror.

```prisma
jobsAddonSubscriptionId   String?   @unique
jobsAddonStatus           String    @default("none")
jobsAddonCurrentPeriodEnd DateTime?
jobsAddonCancelAt         DateTime?
jobsAddonMinimumTermEnd   DateTime?

@@index([jobsAddonStatus])
```

`jobsAddonMinimumTermEnd` is the one locally-computed value:
`addMonths(subscription.created, 3)`, derived from Stripe's own timestamp,
written once at purchase and never recomputed. Recomputing it from "now" on any
later write would let a customer reset their own commitment by triggering an
update.

The `@unique` on `jobsAddonSubscriptionId`, alongside the existing `@unique` on
`stripeSubscriptionId`, is what lets webhook routing look an id up in both
columns without ambiguity.

Lapsed add-on columns are left populated, exactly as `clearSubscription()`
leaves `planTier` and `paidNurseryCount` alone: admin still needs to see what an
account used to have. `jobsAddonStatus` is what gates access.

## Pricing

`backend/src/utils/pricing.ts`:

```ts
export const JOBS_ADDON_MONTHLY_PENCE = 599;
export const JOBS_ADDON_MINIMUM_MONTHS = 3;
export const JOBS_ADDON_ACTIVE_LIMIT = 1;

/** Versioned separately from PRICE_VERSION. */
export const JOBS_ADDON_PRICE_VERSION = 1;

export function jobsAddonLookupKey(): string;              // mathew_jobs_addon_monthly_v1
export function parseJobsAddonLookupKey(key): { version: number } | null;
```

The add-on carries its own version counter so that raising a plan price does not
force a new add-on Price and needlessly grandfather existing add-on holders onto
a stale key.

Monthly only. There is no annual add-on: the three-month minimum already
addresses churn, and an annual £71.88 commitment on a hook priced to feel
impulsive works against the purpose.

`ensurePlanProducts()` gains a third product, `mathew_plan: 'jobs_addon'`, with a
flat non-tiered Price. `verifyPrice()` covers it on the same terms as the others.

`frontend/lib/pricing.ts` mirrors `JOBS_ADDON_MONTHLY_PENCE` and
`JOBS_ADDON_MINIMUM_MONTHS`, and `pricing-parity.test.ts` is extended to cover
both. Without that, the £5.99 on the public banner can drift from what Stripe
charges.

## Entitlements

`entitlements.ts` gains one predicate and one limit:

```ts
export interface JobsAddonAccount {
  jobsAddonStatus: string | null;
}

/** Live on the same status list as everything else. */
export function hasJobsAddon(a: JobsAddonAccount): boolean;

/** null means unlimited. Platinum -> null, add-on -> 1, neither -> 0. */
export function activeJobLimit(a: PlanAccount & JobsAddonAccount): number | null;
```

`features()` changes on exactly one line:

```ts
jobs: normaliseTier(a.planTier) === 'platinum' || hasJobsAddon(a),
```

The other five features stay tier-only. The add-on unlocks jobs and nothing
else, and a test asserts that directly rather than leaving it implied.

`activeJobLimit` returns `null` for unlimited rather than `Infinity`, so it
survives JSON serialisation to the frontend intact.

### Interaction with the main plan

`requireFeature('jobs')` needs no logic change, but its `select` must now fetch
`jobsAddonStatus`. Its existing check order is load-bearing and stays as it is:
`isLive(account)` — the **main plan** — is tested before the feature flag.

The consequence is deliberate. A Standard account whose plan has lapsed gets
`SUBSCRIPTION_INACTIVE` even with a fully paid add-on. If the nursery listing is
not on the site, its job advert has no business being there either.

## Public visibility

`PUBLIC_JOB_WHERE` (`public-visibility.ts:68`) gains a nested OR in the poster
arm:

```ts
{
  subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] },
  OR: [
    { planTier: 'platinum' },
    { jobsAddonStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
  ],
}
```

Main plan live **and** (platinum **or** add-on live). The ADMIN and null-poster
arms are unchanged.

This one filter delivers the whole "advert goes dark, nothing deleted" outcome.
No row is modified when an add-on lapses; the job simply stops matching.

## Components

### `backend/src/utils/jobs-addon-sync.ts` (new)

Deliberately parallel to `subscription-sync.ts`, sharing no code with it.
Mixing them is how a £5.99 add-on change ends up breaking plan billing.

```ts
export interface JobsAddonSnapshot {
  jobsAddonStatus: string;
  jobsAddonCurrentPeriodEnd: Date | null;
  jobsAddonCancelAt: Date | null;
  jobsAddonSubscriptionId: string;
}

export function readJobsAddonSubscription(sub): JobsAddonSnapshot;
export async function reconcileJobsAddon(subscriptionId, userId): Promise<JobsAddonSnapshot>;
export async function clearJobsAddon(userId, status): Promise<void>;
```

`readJobsAddonSubscription` throws `SubscriptionShapeError` unless there is
exactly one item and its lookup key parses as an add-on key.

`reconcileJobsAddon` re-fetches from Stripe rather than trusting a webhook
payload, for the same event-ordering reason documented on
`reconcileFromSubscription`. It does **not** carry duplicate-resolution logic:
the purchase endpoint refuses to create a second add-on while one is live, and
the `@unique` column is the backstop.

`clearJobsAddon` sets `jobsAddonStatus` and nulls `jobsAddonCurrentPeriodEnd`
and `jobsAddonCancelAt`, leaving `jobsAddonMinimumTermEnd` for the record.

### Purchase — `POST /stripe/jobs-addon/checkout`

Authenticated. Guards, in order:

| Check | Failure |
|---|---|
| main plan `isLive` | 403 `SUBSCRIPTION_INACTIVE` |
| `planTier === 'standard'` | 409 `ALREADY_INCLUDED` |
| no live add-on already | 409 `ADDON_ALREADY_ACTIVE` |

Then a Stripe Checkout session: `mode: 'subscription'`, the add-on Price,
reusing the account's existing `stripeCustomerId`, and
`metadata.mathew_purpose = 'jobs_addon'` plus `metadata.userId`. `custom_text`
discloses the three-month minimum on Stripe's own page, mirroring the annual
notice wording at `stripe.controller.ts:271-307`.

Checkout is used rather than charging the card on file, which is what
`applyChange` does for live subscribers. A direct charge would avoid the
redirect, but needs its own SCA/3DS handling for the `incomplete` case, which
Checkout provides free. It also reuses the redirect-then-verify pattern already
present twice in this controller.

Success returns to `/nursery-dashboard/jobs?addon_session={CHECKOUT_SESSION_ID}`,
which calls `POST /stripe/jobs-addon/verify-session`. That endpoint reconciles
and is idempotent, so it racing the webhook is harmless — both write the same
values read from the same source.

### Cancel — `POST /stripe/jobs-addon/cancel`

```
now < jobsAddonMinimumTermEnd
  -> subscriptions.update(id, { cancel_at: unix(jobsAddonMinimumTermEnd) })
     three payments are made, then it ends

otherwise
  -> subscriptions.update(id, { cancel_at_period_end: true })
     runs out the period already paid for
```

The response returns the effective end date so the UI states it rather than
computing it a second time and risking disagreement.

Resuming a scheduled cancellation is out of scope. Re-purchasing is the path.

### Webhook routing — `stripe.controller.ts`

Three edits to `stripeWebhook`. The first is the most important line in this
feature.

1. **`checkout.session.completed`** — before `ensureAccount(session)` at line
   375, branch on `metadata.mathew_purpose === 'jobs_addon'`, resolve the user
   from `metadata.userId`, call `reconcileJobsAddon()`, return. Without this
   branch an add-on checkout falls into `reconcileFromSubscription`, which is
   the function that cancels "duplicate" live subscriptions.

2. **`customer.subscription.updated`** — the lookup on `stripeSubscriptionId`
   at line 387 finds no owner for an add-on, so today the event is silently
   dropped. Add a second lookup on `jobsAddonSubscriptionId` →
   `reconcileJobsAddon()`.

3. **`customer.subscription.deleted`** — the same second lookup →
   `clearJobsAddon(userId, sub.status)`.

Plan lookup always first, add-on second. The two columns are both `@unique` and
disjoint, so an id can never match both.

The existing `SubscriptionShapeError` handling already covers the new reader:
an unrecognisable subscription is acknowledged, logged and investigated by hand
rather than retried forever.

### Platinum upgrade — `cancelJobsAddonOnPlatinum(userId)`

Called after reconcile in both `applyChange` and `verifyUpgradeSession` when the
resulting tier is platinum. Cancels the add-on subscription immediately with
`{ prorate: false }` — no credit note — and clears the columns.

A failure here is logged loudly and **swallowed**. The upgrade has already taken
the customer's money and must not be reported as failed because a £5.99 cleanup
did not land. `reconcileJobsAddon` is idempotent, so the next webhook or a
manual retry corrects it.

A Platinum account that later downgrades to Standard has no add-on and loses
job posting, which is existing behaviour. The paywall card then offers them the
add-on.

### One-active-job enforcement — `nursery.job.controller.ts`

The decision is a pure function, so the matrix is testable without a database:

```ts
export function decideActivation(opts: {
  limit: number | null;
  currentActiveIds: string[];
  targetId: string | null;
  replaceId: string | null;
}): { action: 'allow' }
 | { action: 'swap'; deactivateId: string }
 | { action: 'blocked'; conflictId: string };
```

`nurseryCreateJob` and `nurseryUpdateJob` take a `SELECT ... FOR UPDATE` lock on
the owner's user row before counting and writing, the same pattern `applyChange`
uses at `stripe.controller.ts:617` to serialise against `createNursery()`.
Without it, two concurrent publishes both pass a count-then-write check and
leave two live adverts on a one-advert plan.

A Postgres partial unique index would be a stronger guarantee but cannot express
this constraint: Platinum owners legitimately hold many active jobs, so the
limit depends on the plan rather than the row.

Blocked responses carry what the dialog needs:

```
409 { code: 'ACTIVE_JOB_LIMIT', data: { activeJob: { id, title } } }
```

The client re-submits with `replaceActiveJobId`, and the deactivate and activate
happen in one transaction. There is no way to take an advert down without naming
it, so the confirmation is enforced by the API shape rather than only by the
dialog.

### Entitlements endpoint — `getMyEntitlements`

```ts
jobsAddon: {
  status: string,
  isLive: boolean,
  currentPeriodEnd: string | null,
  cancelAt: string | null,
  minimumTermEnd: string | null,
  canPurchase: boolean,     // plan live && standard && no live add-on
},
activeJobLimit: number | null,
```

`canPurchase` is computed server-side from the same predicates the checkout
guard uses, so the button cannot be shown for a purchase the API would refuse.

`usePlanFeatures()` exposes `jobsAddon` and `activeJobLimit`. `canPostJobs`
already exists and turns true for add-on holders with no call-site change.

## Frontend

**`jobs-paywall-card.tsx`** (new) replaces the dead end at
`nursery-job-management.tsx:320-340`. When `jobsAddon.canPurchase`, two offers:
the add-on at £5.99/mo with its one-live-advert and three-month terms stated, and
Platinum at £38.60/mo. Otherwise the current single message. Extracted rather
than inlined because that file is already 489 lines and gains two more concerns
in this change.

**`swap-active-job-dialog.tsx`** (new), driven by the 409. Names both the advert
going up and the one coming down, then re-submits with `replaceActiveJobId`.

**Status strip** on the Jobs page for add-on holders: "Jobs add-on active · one
live advert · renews 12 Aug", with a cancel link; "ends 12 Oct" once `cancelAt`
is set. The cancel confirmation states the end date returned by the API,
including the minimum-term case, so the commitment is never a surprise.

The `isActive` toggle in `JobFormModal` (`nursery-job-management.tsx:250`) is
relabelled for limit-1 accounts to say one advert may be live at a time.

**Public `/jobs` banner** in `landing-page/jobs-content.tsx`: "Are you a nursery?
Advertise your vacancy from £5.99/mo." Deliberately static markup with no
auth-dependent rendering, because that list is cached 60s with 120s
stale-while-revalidate in `job.controller.ts` and personalising it would poison
the cache. It links to the dashboard, which does the personalised part.

## Tests

Vitest, test-first, matching the density of the existing billing tests.

- `pricing.test.ts` — add-on key round-trips; the add-on key is rejected by
  `parseLookupKey`; plan keys are rejected by `parseJobsAddonLookupKey`. Both
  directions, because that pair is what prevents a silent downgrade.
- `pricing-parity.test.ts` — extended to the two new mirrored constants.
- `price-catalogue.test.ts` — the add-on Price verifies against £5.99 flat.
- `entitlements.test.ts` — `features().jobs` across standard/platinum ×
  add-on live/none/canceled; `activeJobLimit` matrix including the `null`
  unlimited case; and an explicit assertion that the add-on unlocks jobs and
  leaves video, teamMembers, reviewModeration, priorityPlacement and analytics
  locked.
- `jobs-addon-sync.test.ts` — throws on a plan lookup key, on zero items, on two
  items; snapshot field mapping.
- `public-visibility.test.ts` — add-on holder's advert visible; add-on holder
  with a lapsed **plan** not visible; cancelled add-on not visible; Platinum
  unaffected.
- `active-job-limit.test.ts` — the `decideActivation` matrix: unlimited allows
  everything; limit 1 with nothing live allows; limit 1 with something live
  blocks; limit 1 with a matching `replaceId` swaps; a `replaceId` naming a job
  that is not live is rejected; re-saving the already-live job is allowed.
- `stripe.controller.test.ts` — an add-on session routes away from
  `ensureAccount`; each of the three eligibility rejections; the cancel branch
  picks `cancel_at` inside the minimum term and `cancel_at_period_end` outside
  it.

## Migration

One Prisma migration adding the five columns and the index. All are nullable or
defaulted, so it applies to existing rows without a backfill.

Applied with `prisma migrate deploy` before the deploy goes live. Never
`db push` — Railway does not migrate automatically, and the deploy config had a
destructive `db push` removed in e7a925f.

## Out of scope

- Annual billing for the add-on.
- Resuming a scheduled cancellation.
- Any add-on for Group or Platinum accounts.
- Buying more than one concurrent advert slot.
- Migrating existing Platinum accounts to Standard + add-on.
