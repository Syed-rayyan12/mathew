# Recurring subscriptions

Date: 2026-07-30
Status: approved, not yet implemented
Builds on `2026-07-30-single-group-plans-design.md`

## Problem

Checkout runs in `mode: 'payment'`. Every plan is a single charge that never
recurs, while the Checkout button tells the customer the opposite:

> Monthly recurring payment. 90 days written notice required before renewal
> date to cancel.

So an owner pays £23.95, is told it renews monthly and that leaving needs 90
days' notice, and is then never billed again. There is no renewal, no
subscription to cancel, and no code path that would ever charge them twice.

The entitlement model has the matching gap: `paidNurseryCount` is only ever
written by a purchase. Nothing can reduce it, because until now nothing could
stop paying.

## Decisions

| Question | Decision |
|---|---|
| Subscription ends | Listings hidden, data kept, fully reversible |
| Who cancels | Admin only; no self-serve. The 90-day term stays real |
| Mid-cycle upgrade | Subscription updated in place, Stripe prorates and charges the difference now |
| State mirrored locally | Customer id, subscription id, status, current period end |
| Price shape | Volume-tiered Prices in the Stripe catalogue |

## Why the catalogue has to change

Every charge today uses inline `price_data`. The Stripe docs are explicit that
inline prices "are one-time use and cannot be updated or reused", and
`subscriptions.update` takes a Price ID rather than `price_data`. In-place
upgrades therefore require real Price objects. This is the one structurally new
thing in this work.

### Four Prices

| lookup_key | shape |
|---|---|
| `mathew_standard_monthly_v1` | flat £23.95 |
| `mathew_standard_annual_v1` | flat £287.40 |
| `mathew_platinum_monthly_v1` | volume ladder below |
| `mathew_platinum_annual_v1` | same ladder × 12 |

The Platinum price uses `billing_scheme: 'tiered'`, `tiers_mode: 'volume'`:

| up_to | unit |
|---|---|
| 1 | £38.60 |
| 5 | £34.74 |
| 15 | £30.88 |
| 30 | £27.02 |
| 60 | £23.16 |
| inf | £23.16 |

`quantity` is the nursery count and Stripe derives the rate, so Single Platinum
is quantity 1 on the same ladder rather than a separate product. The `inf` tier
exists because Stripe requires the last tier to be unbounded; 61+ stays gated
in `quote()` before anything reaches Stripe, and that gate is now the only
thing preventing a self-serve group of 200.

The Standard prices are flat and always bought at quantity 1. A Standard
account covers one nursery by definition, so there is no ladder to express.

Chosen over one flat Price per band (twelve objects) because it makes "add
nurseries" — the common upgrade — a quantity change that never touches the
price. Stripe resets quantity to 1 whenever an item's price changes, and the
flat-price shape would hit that trap on the most frequent operation.

### Versioned lookup keys

Stripe Prices are immutable: a `unit_amount` or tier ladder cannot be edited
after creation. The version is a hand-bumped integer constant in `pricing.ts`
next to the band table — not a hash, which would produce unreadable keys and
churn on cosmetic edits. A test asserts the two move together, so changing a
band without bumping the version fails the build.

`ensurePlanPrices()` looks each Price up by key and verifies that what it finds
matches `pricing.ts` exactly, creating it only when absent.

This gives price changes the right semantics without extra machinery. Change a
band, the version bumps, a new Price is minted, and existing subscribers stay
on the old one until deliberately migrated. Grandfathering is the default
rather than something to remember, and the third copy of the band table cannot
drift silently — it matches or checkout stops.

## Data model

Four columns on `User`:

```prisma
stripeCustomerId     String?
stripeSubscriptionId String?
subscriptionStatus   String    @default("none")
currentPeriodEnd     DateTime?
```

Stripe remains the source of truth; these are a cache the webhook refreshes.

The existing one-column-one-question split extends to three:

| Question | Column | Function |
|---|---|---|
| What does the plan include? | `planTier` | `features()` |
| How many nurseries does it cover? | `paidNurseryCount` | `allowance()` |
| Is it currently paid for? | `subscriptionStatus` | `isLive()` |

`isLive()` is true for `active`, `trialing` and `past_due`. Past-due counts as
live on purpose: Stripe's retries run for roughly three weeks, and an expired
card should not pull a nursery off the site before anyone can fix it. The
dashboard warns during that window.

`features()` and `allowance()` are unchanged and keep answering "what was
bought". The AND with `isLive()` happens at the three gates that already exist
— `createNursery`, `requireFeature`, and public visibility. Folding billing
status into `features()` would leave admin unable to distinguish a lapsed Group
of 8 from a Single Standard, which is the first thing worth knowing when the
owner calls.

## Plan state comes from the subscription, not metadata

Today `planTier` and `paidNurseryCount` are read out of Stripe session
metadata — a value the client influenced, round-tripped through a third party.
That is the root of three of the four release blockers found in review on
2026-07-30, and the reason `processed_checkout_sessions` and a forced-platinum
normaliser had to exist.

A subscription *is* the plan: the item's Price says which tier, its quantity
says how many nurseries. So there is one reconciler:

```
reconcileFromSubscription(sub) -> planTier            from the Price's product
                                  paidNurseryCount    from item.quantity
                                  subscriptionStatus
                                  currentPeriodEnd
```

Every path calls it: the signup webhook, the upgrade confirmation, and
`customer.subscription.updated`. Replay stops mattering, because re-running it
re-reads current truth and writes the same values. Metadata stops being
load-bearing for anything financial.

`processed_checkout_sessions` stays, but its job narrows to account-creation
idempotency — the webhook/redirect race — and no longer guards plan state.

## Flows

### Signup

`mode: 'subscription'`, `line_items: [{ price, quantity: nurseryCount }]`. The
signup metadata that builds the account is unchanged. `invoice_creation` is
removed; subscriptions invoice automatically.

### Upgrade

Two endpoints, no Stripe redirect:

1. `preview-change` — `invoices.createPreview` returns the exact prorated
   amount due now and the next renewal amount
2. `apply-change` — `subscriptions.update(..., proration_behavior:
   'always_invoice')`, charging the difference to the card on file

The upgrade page becomes a confirmation screen with real numbers. Three cases
behave differently enough to name in the copy:

- **more nurseries, same tier** — quantity only, price untouched
- **Standard → Platinum** — price changes, so quantity must be passed
  explicitly or Stripe silently resets it to 1
- **monthly → annual** — Stripe resets the billing date and charges
  immediately

The `count >= nurseriesInUse` guard added on 2026-07-30 stays. Reductions
produce a credit against the next invoice.

### Lapse and cancellation

Three events cover it: `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`. Status and
period end refresh, `isLive()` flips, listings appear or disappear. No
scheduled job.

Admin gets two actions:

- **Schedule cancellation** — sets `cancel_at` to a chosen date, defaulted to
  90 days out. Billing continues until then.
- **Cancel immediately** — for disputes and refunds.

Reactivation is a fresh subscription Checkout against the existing customer
record. Hidden nurseries return on their own.

## Public visibility

One shared fragment replaces ten hand-rolled filters:

```ts
export const PUBLIC_NURSERY_WHERE = {
  isApproved: true,
  owner: { OR: [{ role: 'ADMIN' }, { subscriptionStatus: { in: LIVE } }] },
};
```

`Nursery.ownerId` is non-nullable, so every nursery joins to a user. The ADMIN
branch keeps admin-created nurseries visible and mirrors the ADMIN
pass-through already in `requireFeature`.

A survey of the backend found eleven public nursery and group queries, none
sharing a filter. Two need individual handling:

- **`getNurseryBySlug` has no approval filter at all**
  (`user.nursery.controller.ts:675`). Any unapproved nursery is publicly
  readable by slug today. Pre-existing, but it cannot be left: the detail page
  is what stays indexed after a lapse, so without this the feature does
  nothing. It gets the shared fragment.
- **`searchNurseries` omits the filter deliberately** so parents can review any
  nursery. That must keep working — a review cannot be blocked because the
  owner stopped paying. It keeps its own query and is the single documented
  exception.

## Admin and payment history

The admin table gains status, next renewal date, any scheduled cancellation
date, and the two cancel actions.

Payment History moves from `checkout.sessions.list` to `invoices.list`.
Renewals are invoices, not sessions, so every renewal payment would otherwise
be invisible. This also resolves the review finding that invoice history cannot
distinguish Single Platinum from a Group: the invoice line carries the
quantity.

## Error handling

**Catalogue verification runs on first checkout**, alongside the existing
`ensurePlanProducts()` call — not at boot. A Stripe blip should not take the
public site down to protect a path nobody is mid-way through. A mismatch blocks
checkout and leaves the site up.

**Webhooks re-fetch the subscription** rather than trusting the payload.
Stripe does not guarantee ordering, so a stale `subscription.updated` could
otherwise overwrite a newer one. One extra API call per event at this volume,
and every write is current truth by construction.

**A declined upgrade charge is accepted as-is.** `always_invoice` can fail
after the quantity has already changed; the subscription goes `past_due`, which
is still live, so the owner briefly holds the larger allowance unpaid. Stripe
retries, and a final failure hides everything. The alternative is unwinding a
quantity change mid-flight, which is worse.

## Testing

Covering only what decides money and access, per the existing convention:

- `toStripeTiers(GROUP_BANDS)` produces the exact ladder, and the version
  suffix changes when any band changes
- `isLive()` for every Stripe status string, including unrecognised ones
- gate composition — `canAddNursery` is false when not live even with headroom
- a file-reading test, following `pricing-parity.test.ts`, asserting every
  public nursery query in `user.nursery.controller.ts` uses the shared
  fragment, with `searchNurseries` allowlisted

## Rollout

Existing owners default to `subscriptionStatus: 'none'`, so demo or seed
nurseries on Railway disappear when this deploys unless their owner is an ADMIN
or they are backfilled. The contents of that database need checking before the
migration runs.

The Checkout copy promising 90 days' notice becomes true at the same moment
this ships, and not before.

## Out of scope

- **Self-serve cancellation and the Stripe Billing Portal.** Admin-only by
  decision. Revisit if support volume justifies it.
- **Migrating existing subscribers to a new Price version.** The versioning
  makes it possible; the migration itself is separate work.
- **Band boundaries produce non-monotonic totals** — 15 nurseries cost more
  than 16. Carried over from the previous design as supplied pricing, not a
  code bug. Still worth raising with Matt.
- **Dunning emails.** Stripe's own retry emails are assumed sufficient.
