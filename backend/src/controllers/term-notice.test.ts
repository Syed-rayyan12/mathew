import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TERM_NOTICE_SENTENCE, OFFER_TERM_NOTICE_SENTENCE } from '../utils/pricing';

// Vitest runs from backend/.
const component = readFileSync(
  join(process.cwd(), '../frontend/components/shared/term-notice.tsx'),
  'utf8'
);

const controller = readFileSync(
  join(process.cwd(), 'src/controllers/stripe.controller.ts'),
  'utf8'
);

describe('term disclosure parity', () => {
  it('matches the frontend component word for word', () => {
    expect(component).toContain(TERM_NOTICE_SENTENCE);
  });

  it('matches the frontend offer variant word for word', () => {
    expect(component).toContain(OFFER_TERM_NOTICE_SENTENCE);
  });

  it('is not hand-copied into the Checkout calls', () => {
    // Both Checkout paths must go through checkoutTerms(). A literal copy of
    // the sentence in the controller is the drift this whole task prevents.
    expect(controller).not.toContain('Your subscription runs for a minimum of');
    expect(controller).not.toContain('Your first six months are free');
    expect(controller.split('checkoutTerms(').length - 1).toBe(2);
  });

  it('promises free months only where the server granted the offer', () => {
    // createUpgradeSession reactivates an existing account and never gets a
    // trial, so it must call checkoutTerms with no offer flag. The signup path
    // passes the server's own eligibility decision, never the claimed code.
    expect(controller).toContain('checkoutTerms(billing, offerApplies)');
    expect(controller).toContain('checkoutTerms(billing)');
  });
});
