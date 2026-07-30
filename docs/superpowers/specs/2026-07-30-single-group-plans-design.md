# Single / Group plans, with enforced per-nursery billing

Date: 2026-07-30
Status: approved, not yet implemented
Supersedes the plan model introduced in d1579b9

## Problem

Commit d1579b9 introduced volume pricing but modelled the plans wrongly. It
treated `platinum` as a synonym for "Group", which had two consequences:

1. **Single Platinum became unpurchasable.** `quote('platinum', billing, 1)`
   throws `'The Group plan starts at two nurseries.'` A one-nursery owner who
   wants video, jobs, team profiles or priority placement now has no way to pay
   for them. That was £38.60/mo before the commit.
2. **The paid nursery count is never stored.** It exists only in Stripe session
   metadata. Nothing reads it back, so an owner who pays for two nurseries can
   create fifty, admin cannot tell "paid for 2" from "paid for 60", and the
   owner cannot see their own allowance.

The band rates are 10/20/30/40% off £38.60, which confirms the intended shape:
Group is Platinum-tier features sold at a volume discount, and there is no
Standard variant of Group.

There are no live customers, so the internal plan keys can be renamed and no
backfill is required.

## The products

| Product | Nurseries | Per-nursery / month | Tier |
|---|---|---|---|
| Single Standard | 1 | £23.95 | basic |
| Single Platinum | 1 | £38.60 | premium |
| Group 2–5 | 2–5 | £34.74 (−10%) | premium |
| Group 6–15 | 6–15 | £30.88 (−20%) | premium |
| Group 16–30 | 16–30 | £27.02 (−30%) | premium |
| Group 31–60 | 31–60 | £23.16 (−40%) | premium |
| Group 61+ | 61+ | bespoke, routed to contact | premium |

Total is the per-nursery rate times the nursery count. Annual is monthly × 12
with no further discount.

## Data model

`User.plan` is replaced by two columns:

```prisma
planTier          String  @default("standard")  // "standard" | "platinum"
paidNurseryCount  Int     @default(1)
```

"Group" is **not stored**. It is derived: `paidNurseryCount >= 2`.

This was chosen over storing an explicit `planType: 'single' | 'group'`, which
would be fully derivable from the count and therefore able to contradict it
(`planType: 'group'` with `paidNurseryCount: 1`). With the derived form, the
rule "Group has no Standard tier" reduces to a single invariant enforced in one
place: `paidNurseryCount >= 2 && planTier === 'standard'` is rejected.

## Components

### `backend/src/utils/entitlements.ts` (new)

The single answer to "what is this account allowed to do".

| Function | Depends on | Returns |
|---|---|---|
| `isGroup(user)` | `paidNurseryCount` | `paidNurseryCount >= 2` |
| `planLabel(user)` | both | `"Single Standard"` / `"Single Platinum"` / `"Group of 8"` |
| `features(user)` | `planTier` only | `{ jobs, video, teamMembers, reviewModeration, priorityPlacement, analytics }` |
| `allowance(user, usedCount)` | `paidNurseryCount` only | `{ paid, used, remaining }` |

`features()` and `allowance()` read one column each, so tier changes cannot
affect allowance and vice versa. Every surface — owner dashboard, admin,
pricing page — derives its wording from `planLabel()`, so they cannot disagree.

### `backend/src/utils/pricing.ts` (revised)

Keeps its existing responsibility: turn `(tier, billing, nurseryCount)` into
money. It is the only thing that decides what gets charged, and the client
never sends a price.

- `nurseryCount === 1` → flat rate for that tier (£23.95 or £38.60)
- `nurseryCount >= 2` → band lookup, requires `tier === 'platinum'`
- `nurseryCount >= 2 && tier === 'standard'` → throw
- `nurseryCount >= 61` → throw, caller routes to contact

Invalid combinations throw rather than falling back to a default. A wrong price
is worse than a failed checkout.

`frontend/lib/pricing.ts` continues to mirror the bands for display only, so
the page can show a running total without a round trip per keystroke.

## Data flow

### Purchase

```
client sends (tier, billing, nurseryCount)  — never a price
  -> pricing.quote() derives the charge
  -> describeQuote() becomes Stripe price_data.product_data
  -> checkout session metadata carries tier + nurseryCount
  -> webhook / verify-payment both call reconcileAccount()
       sets planTier and paidNurseryCount from metadata
```

Both completion paths call the same `reconcileAccount()`, so they cannot
diverge, and it is idempotent when the webhook and the success redirect both
fire.

A purchase always reconciles the account to what was just bought. This fixes
the current bug where the existing-owner branch creates a group without
touching the plan, and `verify-payment` early-returns on an existing user — so
a Single owner who pays for Group stays Single.

### Enforcement

`createNursery` checks the allowance before writing:

```
used = count of nurseries owned by this user
if (used >= user.paidNurseryCount)
    403 { code: 'NURSERY_LIMIT_REACHED', paid, used }
```

A Single account has `paidNurseryCount: 1`, so the same check covers "Standard
cannot add a second nursery". There is no special case for Single vs Group, and
`Infinity` disappears from the codebase.

Job, video and team-member endpoints gain matching `features()` checks. These
are gated in the UI today but not on the server, and since the UI reads the
plan from `localStorage` (`use-nursery-plan.ts:9`) the gate is currently
decorative — editing one storage key unlocks the Platinum UI.

The frontend continues to read a plan hint for display, but every gate is
server-side. The dashboard fetches entitlements from an endpoint rather than
trusting storage.

### Over-limit behaviour

Blocked, not auto-charged. The dashboard disables "Add nursery" at the limit
and shows `5 of 5 nurseries used — add more to your plan`, linking to upgrade.
The 403 is the real gate; the UI check only avoids a pointless round trip.

## Scope decisions

**One group per owner.** `getMyGroup` and `createNursery` both use `findFirst`,
so a second group is unreachable in the dashboard. Rather than build multi-group
support, checkout rejects a purchase from an owner who already has a group and
routes them to the upgrade flow, which is the flow that works.

**Upgrade stays a fresh checkout.** It is the one place a plan changes after
signup, and covers three cases that are currently conflated: tier change at the
same count, more nurseries at the same tier, and both together. Swapping it for
a Stripe subscription-quantity update is a follow-up once subscriptions are set
up; it touches one function.

**Bug fix carried in:** the upgrade button says "Contact us for a quote" at 61+
but `handleUpgrade` has no bespoke guard, so it POSTs anyway and the server
400s. It gets the guard and routes to contact.

## Naming

Display-only, all driven by `planLabel()`:

- `sidebar.tsx` — "Platinum" badge, "You're on Standard", "Upgrade to Platinum"
- `pricing.tsx` — "Unlimited Nursery Locations" is now false; becomes the
  volume-discount line. Comparison table header.
- `utils/stripe.ts` — Stripe product names. `mathew_plan` metadata remains the
  identifier, so the rename is display-only and does not orphan anything.
- `describeQuote()` output is wired into `price_data.product_data`. It is
  currently computed and discarded, because `price_data` only reads
  `unitAmount`.

## Admin

The subscriptions endpoint returns Stripe totals but nothing about entitlement.
It gains `planTier`, `paidNurseryCount`, `nurseriesUsed`, `billingPeriod` and
the band rate, all sourced from `entitlements.ts`. The table shows
`planLabel()` and a `used / paid` column so over-allowance accounts are visible
at a glance.

## Testing

The repository has no tests. This adds unit tests for `pricing.ts` and
`entitlements.ts` only, since those two decide money and access:

- every rate and band boundary in the table above
- annual = monthly × 12
- rejections: Standard with count > 1, Group with count < 2, count >= 61,
  non-integer and negative counts
- `features()` by tier, `allowance()` at and over the limit
- backend and frontend band tables agree

## Out of scope

- **Band boundaries produce non-monotonic totals.** 15 nurseries costs £463.20
  while 16 costs £432.32; the same happens at all four boundaries. This is the
  supplied pricing table, not a code bug, so it is implemented as given. It
  should be raised with Matt.
- **`mode: 'payment'` is a one-time charge, not a recurring subscription**,
  despite the "recurring / 90 days notice" wording. Being handled separately in
  Stripe.
- **Multi-group ownership**, per the scope decision above.
