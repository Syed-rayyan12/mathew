import { describe, it, expect, vi, afterEach } from 'vitest';

const setWindow = (endsAt: string | undefined) => {
  vi.resetModules();
  process.env.OFFER_ENDS_AT = endsAt ?? '';
};

const NOW = new Date('2026-08-05T00:00:00Z');

describe('offerIsOpen', () => {
  const original = process.env.OFFER_ENDS_AT;
  afterEach(() => { process.env.OFFER_ENDS_AT = original; });

  it('is open inside the window', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { offerIsOpen } = await import('./offer');
    expect(offerIsOpen(NOW)).toBe(true);
  });

  it('is closed after the window', async () => {
    setWindow('2026-06-30T23:59:59Z');
    const { offerIsOpen } = await import('./offer');
    expect(offerIsOpen(NOW)).toBe(false);
  });

  it('is closed when no window is configured', async () => {
    // Unsetting OFFER_ENDS_AT is the kill switch — it must fail closed.
    setWindow(undefined);
    const { offerIsOpen } = await import('./offer');
    expect(offerIsOpen(NOW)).toBe(false);
  });

  it('is closed when the window is unparseable', async () => {
    setWindow('not a date');
    const { offerIsOpen } = await import('./offer');
    expect(offerIsOpen(NOW)).toBe(false);
  });
});

describe('offerAppliesTo', () => {
  const original = process.env.OFFER_ENDS_AT;
  afterEach(() => { process.env.OFFER_ENDS_AT = original; });

  it('applies to a brand new signup', async () => {
    setWindow('2026-12-31T23:59:59Z');
    const { offerAppliesTo } = await import('./offer');
    expect(offerAppliesTo(null, NOW)).toBe(true);
    expect(offerAppliesTo({ minimumTermEnd: null }, NOW)).toBe(true);
  });

  it('does not apply to an account that already had a term', async () => {
    // The farming case: cancel, come back, claim another six free months.
    setWindow('2026-12-31T23:59:59Z');
    const { offerAppliesTo } = await import('./offer');
    expect(
      offerAppliesTo({ minimumTermEnd: new Date('2025-01-01T00:00:00Z') }, NOW)
    ).toBe(false);
  });

  it('does not apply to anyone once the window closes', async () => {
    setWindow('2026-06-30T23:59:59Z');
    const { offerAppliesTo } = await import('./offer');
    expect(offerAppliesTo(null, NOW)).toBe(false);
  });

  it('treats a past term end as used, not expired', async () => {
    // A term that has already elapsed still means the account has subscribed
    // before. Null is the only "never had one".
    setWindow('2026-12-31T23:59:59Z');
    const { offerAppliesTo } = await import('./offer');
    expect(
      offerAppliesTo({ minimumTermEnd: new Date('2020-01-01T00:00:00Z') }, NOW)
    ).toBe(false);
  });
});
