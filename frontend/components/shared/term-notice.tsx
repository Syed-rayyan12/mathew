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
  'The service runs on a 12 month rolling contract. It renews automatically each year unless you cancel in writing at least 90 days before the renewal date.';

/**
 * Shown only where the launch offer actually applies.
 *
 * An account that has already had a term gets no second trial, so this must
 * not appear where such a customer is being charged today — the free-months
 * claim would be untrue for them. Mirrors OFFER_TERM_NOTICE_SENTENCE in
 * backend/src/utils/pricing.ts, which carries the full note on why this
 * wording differs from what the code enforces.
 */
export const OFFER_TERM_NOTICE_TEXT =
  'Your first six months are free. After that, the service runs on a 12 month rolling contract. It renews automatically each year unless you cancel in writing at least 90 days before the renewal date.';

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
