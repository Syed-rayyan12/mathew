import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const setWindow = (endsAt: string | undefined) => {
  vi.resetModules();
  process.env.OFFER_ENDS_AT = endsAt ?? '';
};

describe('isOfferEligible', () => {
  const original = process.env.OFFER_ENDS_AT;
  afterEach(() => { process.env.OFFER_ENDS_AT = original; });

  it('accepts the launch code inside the window', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('launch6', new Date('2026-08-05T00:00:00Z'))).toBe(true);
  });

  it('rejects the launch code after the window closes', async () => {
    setWindow('2026-06-30T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('launch6', new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });

  it('rejects an unknown code', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('freestuff', new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });

  it('rejects a missing code', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible(undefined, new Date('2026-08-05T00:00:00Z'))).toBe(false);
    expect(isOfferEligible('', new Date('2026-08-05T00:00:00Z'))).toBe(false);
    expect(isOfferEligible(42, new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });

  it('rejects everything when no window is configured', async () => {
    setWindow(undefined);
    const { isOfferEligible } = await import('./offer');
    expect(isOfferEligible('launch6', new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });
});
