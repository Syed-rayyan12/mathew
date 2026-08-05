/**
 * The contract disclosure, in one place.
 *
 * The same sentence appears on the pricing page, in the signup summary and on
 * the Stripe Checkout button. It is the reason a month-two cancellation
 * request is answerable rather than a chargeback, so the three copies must not
 * drift — the Stripe copy lives in stripe.controller.ts and is asserted
 * against this string by term-notice.test.ts.
 */

export const TERM_NOTICE_TEXT =
  "12-month minimum term. Subscriptions run for 12 months from your start date. To cancel, 90 days' written notice is required — your subscription ends on the later of your 12-month term end or 90 days from the date notice is given.";

export default function TermNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-sm text-muted-foreground font-sans leading-relaxed max-w-3xl mx-auto text-center px-6 py-4 ${className}`}
    >
      {TERM_NOTICE_TEXT}
    </p>
  );
}
