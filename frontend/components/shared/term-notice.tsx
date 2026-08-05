/**
 * The contract disclosure, in one place.
 *
 * The same sentence appears on the pricing page, in the signup summary and on
 * the Stripe Checkout button. It is the reason a month-two cancellation
 * request is answerable rather than a chargeback, so the three copies must not
 * drift — the Stripe copy lives in stripe.controller.ts and is asserted
 * against this string by term-notice.test.ts.
 */

import { cn } from '@/lib/utils';

export const TERM_NOTICE_TEXT =
  "Your subscription runs for a minimum of 12 months from your start date. You can cancel at any time by giving 90 days' written notice — your subscription ends on the later of your 12-month term end or 90 days from the date you give notice.";

/**
 * Shown only where the launch offer actually applies.
 *
 * The free months are gated on the launch6 code, so this must not appear on
 * the pricing page, on a full-price signup or on an upgrade — those people
 * are being charged today and the free-months claim would be untrue.
 */
export const OFFER_TERM_NOTICE_TEXT =
  "Your first six months are free. Your subscription runs for a minimum of 12 months from your start date, which includes the free months. You can cancel at any time by giving 90 days' written notice — your subscription ends on the later of your 12-month term end or 90 days from the date you give notice.";

export default function TermNotice({
  className = '',
  offer = false,
}: {
  className?: string;
  offer?: boolean;
}) {
  return (
    <p
      // cn(), not template interpolation: the callers that inline this under a
      // button pass px-0/mx-0 to kill the centred page-level padding, and a
      // plain string leaves both classes in the list for the stylesheet order
      // to arbitrate. twMerge makes the caller win.
      className={cn(
        'text-sm text-muted-foreground font-sans leading-relaxed max-w-3xl mx-auto text-center px-6 py-4',
        className
      )}
    >
      {offer ? OFFER_TERM_NOTICE_TEXT : TERM_NOTICE_TEXT}
    </p>
  );
}
