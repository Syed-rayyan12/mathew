'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, CreditCard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEntitlements } from '@/hooks/use-nursery-plan';

/**
 * What the dashboard says about the state of the subscription.
 *
 * The entitlements endpoint reports what was bought and whether it is paid for
 * as two separate answers. The rest of the dashboard uses that to decide what
 * to switch off; this is the one place that explains why. Without it a lapsed
 * owner watches their listings disappear and their buttons grey out with no
 * account of what happened.
 *
 * Three things can be worth saying, in this order of seriousness:
 *
 *   past_due   the card failed and Stripe is retrying. Still live — see
 *              LIVE_SUBSCRIPTION_STATUSES — so this is a warning, not a
 *              eulogy, and it must not imply the listings are already gone.
 *   lapsed     the plan is over and the nurseries are off the site.
 *   cancelAt   an end date is booked. Everything works until it arrives.
 *
 * A never-subscribed account (status "none") gets nothing: the sidebar already
 * makes that pitch, and a second one at the top of every screen is nagging.
 */

/**
 * Billing dates are London dates. Left to the browser's own zone, a renewal at
 * midnight UK time renders as the previous day for anyone further west, which
 * on a screen about money is worse than useless.
 */
function formatLondonDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
}

/** Warning tone. The shared Alert ships default and destructive only. */
const WARNING = 'border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600';
const WARNING_BODY = 'text-amber-800';

export default function BillingStatusBanner() {
  const { data, loading } = useEntitlements();

  // Entitlements load after the first paint, and the failure case leaves them
  // null. Either way, say nothing rather than flash "your plan has ended" at
  // someone whose plan is fine.
  if (loading || data == null) return null;

  if (data.subscriptionStatus === 'past_due') {
    return (
      <Alert className={`mb-5 ${WARNING}`}>
        <CreditCard />
        <AlertTitle>Your last payment didn&apos;t go through</AlertTitle>
        <AlertDescription className={WARNING_BODY}>
          <p>
            We&apos;re retrying the card on your account. Your nurseries stay live on the
            site for now, but they&apos;ll be hidden if the payment doesn&apos;t clear.
          </p>
          <Link
            href="/nursery-dashboard/help-and-support"
            className="font-semibold underline underline-offset-2"
          >
            Get in touch to update your card details
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Named via planLabel, so it reads "your Group of 8 has ended" rather than
  // quietly demoting them to a plan they never held.
  if (!data.isLive && data.subscriptionStatus !== 'none') {
    return (
      <Alert variant="destructive" className="mb-5 border-destructive/40 bg-destructive/5">
        <AlertTriangle />
        <AlertTitle>Your {data.planLabel} plan has ended</AlertTitle>
        <AlertDescription>
          <p>
            Your nurseries are hidden from the site and the features on your plan are
            switched off. Parents can&apos;t find you until your plan is running again.
          </p>
          <Link
            href="/nursery-dashboard/upgrade"
            className="font-semibold underline underline-offset-2"
          >
            Restart your plan
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const endsOn = data.isLive ? formatLondonDate(data.cancelAt) : null;
  if (endsOn) {
    return (
      <Alert className={`mb-5 ${WARNING}`}>
        <CalendarClock />
        {/* AlertTitle clamps to one line, so the date carries the title and
            the plan name is left to the body. */}
        <AlertTitle>Your plan ends on {endsOn}</AlertTitle>
        <AlertDescription className={WARNING_BODY}>
          <p>
            Your {data.planLabel} plan carries on as normal until then — your nurseries
            stay live on the site and your features stay switched on. After that date
            your nurseries will be hidden.
          </p>
          <Link
            href="/nursery-dashboard/help-and-support"
            className="font-semibold underline underline-offset-2"
          >
            Get in touch if you&apos;d like to keep your plan
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
