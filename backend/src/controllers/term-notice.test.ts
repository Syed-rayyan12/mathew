import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TERM_NOTICE_SENTENCE } from '../utils/pricing';

// Vitest runs from backend/.
const component = readFileSync(
  join(process.cwd(), '../frontend/components/shared/term-notice.tsx'),
  'utf8'
);

describe('term disclosure parity', () => {
  it('matches the frontend component word for word', () => {
    expect(component).toContain(TERM_NOTICE_SENTENCE);
  });

  it('is not hand-copied into the Checkout calls', () => {
    // Both Checkout paths must go through checkoutTerms(). A literal copy of
    // the sentence in the controller is the drift this whole task prevents.
    const controller = readFileSync(
      join(process.cwd(), 'src/controllers/stripe.controller.ts'),
      'utf8'
    );
    expect(controller).not.toContain('12-month minimum term. Subscriptions run');
    expect(controller.split('checkoutTerms(billing)').length - 1).toBe(2);
  });
});
