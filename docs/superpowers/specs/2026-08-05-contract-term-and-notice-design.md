# 12-month term, 90-day notice, and the launch offer

## Problem

The homepage CTA advertises "Get your first 6 months completely FREE when you
sign up" and links to `/pricing`. Nothing downstream knows an offer exists —
no trial, no coupon, no query parameter. The visitor lands on full prices and
the promise evaporates.

Separately, the 90-day notice period is already real but the 12-month
commitment it implies is not. Notice is disclosed on the Checkout button
(`stripe.controller.ts:849`), self-serve cancellation is deliberately absent,
and `schedule-cancellation` defaults `cancel_at` to today + 90 days
(`admin-subscription.controller.ts:19-22`). But nothing stops that
cancellation landing in month two. Six free months on top of a terminable-at-
will subscription is a giveaway.

This design makes the offer real, makes the term real, and gives the notice
period a recorded served-on date instead of email archaeology.

## What already exists

The £6.99 jobs add-on solved the same problem three weeks ago and its shape is
reused wholesale:

- `jobsAddonMinimumTermEnd` on `User`, written once at checkout
  (`stripe.controller.ts:1125-1133`), idempotent via a `where` clause that
  matches only the null case.
- `jobsAddonCancel` pins `cancel_at` to the term end inside the term and falls
  back to `cancel_at_period_end` outside it (`stripe.controller.ts:1178-1192`).
- `JOBS_ADDON_MINIMUM_MONTHS` lives in `utils/pricing.ts` and is covered by
  `pricing-parity.test.ts`, which asserts the frontend mirror agrees.

The main plan gets the same treatment with one addition: a notice clock that
the add-on does not have.

## Decisions

| Question | Decision |
| --- | --- |
| What "6 months free" means | A 6-month Stripe trial inside a 12-month term. Card captured at signup, £0 for six months, billed months 7–12. |
| Who gets the term | Every new main-plan subscription — both tiers, both billing intervals. Existing subscribers are grandfathered. |
| Term vs. notice | End date is the **later** of the two clocks. No rolling renewal. |
| Cancelling during the trial | The term binds. Trial runs its course, months 7–12 are billed, subscription ends at the term end. |
| Who gets the offer | Only visitors arriving through the homepage CTA link, inside a config-controlled window. Direct pricing-page traffic pays from day one. |
| How notice is served | Self-serve request from the nursery dashboard records the timestamp; an admin confirms and writes `cancel_at` to Stripe. |

### On offer leakage

The offer travels in a URL, so it is public the moment anyone shares it, and a
visitor who crafts the URL by hand can self-grant it. There is no account row
to bind it to beforehand — the nursery signup flow creates the `User` from
Checkout session metadata, so the account does not exist until payment
completes (`stripe.controller.ts:274-300`).

This was accepted rather than solved. The controls that remain are the
server-side config window and the term itself: a leaked signup still yields six
paid months and a 12-month listing commitment. Anything stronger — single-use
tokens, gated invite codes — buys little against that backstop.

## Data model

Four columns on `User`:

```prisma
/// The 12-month minimum term on the main plan. Set once, by the webhook that
/// starts the subscription. Null on accounts that predate the term.
minimumTermEnd    DateTime?
/// When cancellation notice was served, for the 90-day clock. Written by the
/// nursery's self-serve request, read by the admin confirm.
noticeServedAt    DateTime?
/// "none" | "requested" | "confirmed". Drives the admin queue.
noticeStatus      String   @default("none")
/// The campaign the account signed up under, carried from the CTA through
/// Checkout metadata. Null means full price from day one.
offerCode         String?
```

`cancelAt` already exists and remains the single source of truth for when a
subscription actually ends. The new columns feed the calculation that produces
it; they do not replace it.

Migration runs against Railway with `prisma migrate deploy` **before** the
code push, never after — Railway does not migrate on deploy.

## Enforcement

One pure function in `utils/pricing.ts`, beside the add-on constants, so it is
testable without a Stripe round trip and picked up by the parity test:

```ts
export const PLAN_MINIMUM_TERM_MONTHS = 12;
export const NOTICE_DAYS = 90;
export const OFFER_TRIAL_MONTHS = 6;

/** The earliest date a subscription may end: the later of the two clocks. */
export function cancellationEndDate(
  minimumTermEnd: Date | null,
  noticeServedAt: Date,
): Date {
  const noticeEnd = new Date(noticeServedAt.getTime() + NOTICE_DAYS * 864e5);
  if (!minimumTermEnd) return noticeEnd;
  return noticeEnd > minimumTermEnd ? noticeEnd : minimumTermEnd;
}
```

Worked examples, for a subscription starting 1 January:

| Notice served | Notice + 90d | Term end | Subscription ends |
| --- | --- | --- | --- |
| 1 March (m2) | 30 May | 1 Jan +1yr | 1 Jan +1yr — term binds |
| 1 October (m9) | 30 Dec | 1 Jan +1yr | 1 Jan +1yr — term binds |
| 1 December (m11) | 1 March +1yr | 1 Jan +1yr | 1 March +1yr — notice binds |
| Never | — | — | Rolls month to month past the term |

After the term ends without notice, the subscription continues month to month
and the notice period alone governs. There is no automatic second term.

### Call sites

1. **Checkout creation** — when the account is offer-eligible, the session
   gains `subscription_data: { trial_period_days: OFFER_TRIAL_MONTHS * 30.44
   rounded to 183 }`. `offerCode` goes into `session.metadata`.
   `custom_text.submit` gains the term sentence.
2. **`checkout.session.completed`** — sets `minimumTermEnd = created + 12
   months` and persists `offerCode` onto the new `User`. Idempotent via
   `where: { id, minimumTermEnd: null }`, matching the add-on at line 1131.
3. **Admin confirm** — `schedule-cancellation` replaces its `noticeDefault()`
   with `cancellationEndDate(user.minimumTermEnd, user.noticeServedAt)`. A
   manually supplied date earlier than that floor is rejected unless the
   request carries `override: true`.

`cancelImmediately` is untouched. It bypasses the term by design and remains
the escape hatch for refunds and disputes.

## Notice request flow

`POST /api/stripe/plan/request-cancellation`, authenticated the same way as
`jobsAddonCancel`.

It does not call Stripe. It writes `noticeServedAt = now()` and `noticeStatus
= 'requested'`, then returns the computed end date so the nursery sees the
consequence before they close the tab:

> Your notice is recorded as of 5 August 2026. Your subscription will end on
> 12 March 2027 — your 12-month minimum term runs to that date. You'll be
> billed as normal until then.

A repeat request returns the existing `noticeServedAt` unchanged rather than
restarting the clock, so the nursery cannot accidentally move their own end
date in either direction.

The UI sits on `nursery-dashboard/upgrade`, next to the existing "90 days
notice required to cancel" line at `page.tsx:546`.

On the admin side, `components/nursery-admin-panel/subscriptions/
subscriptions.tsx` grows a "Notice requested" state showing the served date,
the computed floor, and a Confirm button that calls the existing
`schedule-cancellation` endpoint and sets `noticeStatus = 'confirmed'`.

## Disclosure

One shared banner component, one sentence, rendered in three places so the
marketing page and the Checkout disclosure cannot drift apart:

> **12-month minimum term.** Subscriptions run for 12 months from your start
> date. To cancel, 90 days' written notice is required — your subscription
> ends on the later of your 12-month term end or 90 days from the date notice
> is given.

Rendered on the pricing page beneath `PricingBanner`, in the nursery signup
summary at `nursery-signup/page.tsx:651`, and as the `custom_text.submit`
string on both Checkout paths.

Given that the term binds through the trial, this wording carries the weight
of the whole design. It is the reason a month-two cancellation request is
answerable rather than a chargeback.

## The CTA

`components/landing-page/cta-section.tsx:32` changes from `/pricing` to
`/nursery-signup?offer=launch6`. The sub-copy at line 31 becomes:

> Get your first 6 months completely FREE — then a 12-month minimum term
> applies.

When the config window has closed, the link falls back to `/nursery-signup`
and the offer copy is hidden, so the homepage cannot advertise something
Checkout will refuse to honour. The "Get first 6 months free" stat bubble at
line 10 is driven by the same flag.

## Testing

- `cancellationEndDate` — unit tests for all three branches: term binds,
  notice binds, grandfathered null.
- `pricing-parity.test.ts` — gains an explicit assertion per new constant
  (`PLAN_MINIMUM_TERM_MONTHS`, `NOTICE_DAYS`, `OFFER_TRIAL_MONTHS`). The
  mirror is not automatic: the file asserts each constant by name through its
  `constant(name)` helper, so a new value needs a new line in both
  `frontend/lib/pricing.ts` and the test.
- Webhook idempotency for `minimumTermEnd`, mirroring the add-on's coverage.
- `request-cancellation` — a second call must not move `noticeServedAt`.
- `schedule-cancellation` — rejects a date below the floor without
  `override`, accepts one above it.

## Out of scope

- Retrofitting the term onto existing subscribers.
- Any automatic second term or rolling renewal.
- Self-serve cancellation without an admin step — the confirm exists because
  someone has to check notice was genuinely given.
