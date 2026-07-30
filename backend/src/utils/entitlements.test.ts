import { describe, it, expect } from 'vitest';
import {
  normaliseTier,
  isGroup,
  planLabel,
  features,
  allowance,
  canAddNursery,
  planFromMetadata,
} from './entitlements';
import { quote } from './pricing';

const single = (tier: string, paid = 1) => ({ planTier: tier, paidNurseryCount: paid });

describe('normaliseTier', () => {
  it('passes through known tiers', () => {
    expect(normaliseTier('standard')).toBe('standard');
    expect(normaliseTier('platinum')).toBe('platinum');
  });

  it('falls back to standard for anything unrecognised', () => {
    // Legacy rows carried plan: 'free'. Unknown must never mean platinum.
    for (const bad of ['free', '', 'PLATINUM', null, undefined]) {
      expect(normaliseTier(bad as any), `tier ${bad}`).toBe('standard');
    }
  });
});

describe('isGroup', () => {
  it('is two or more nurseries', () => {
    expect(isGroup(single('platinum', 1))).toBe(false);
    expect(isGroup(single('platinum', 2))).toBe(true);
    expect(isGroup(single('standard', 1))).toBe(false);
  });

  it('treats a missing count as one', () => {
    expect(isGroup({ planTier: 'platinum', paidNurseryCount: null })).toBe(false);
  });
});

describe('planLabel', () => {
  it('names all three products', () => {
    expect(planLabel(single('standard', 1))).toBe('Single Standard');
    expect(planLabel(single('platinum', 1))).toBe('Single Platinum');
    expect(planLabel(single('platinum', 8))).toBe('Group of 8');
  });

  it('never says Group Standard', () => {
    // Rejected at the pricing layer, but a hand-edited row must not crash.
    expect(planLabel(single('standard', 4))).toBe('Group of 4');
  });
});

describe('features', () => {
  it('unlocks everything on platinum regardless of count', () => {
    for (const paid of [1, 12]) {
      const f = features(single('platinum', paid));
      expect(f).toEqual({
        jobs: true,
        video: true,
        teamMembers: true,
        reviewModeration: true,
        priorityPlacement: true,
        analytics: true,
      });
    }
  });

  it('locks everything on standard regardless of count', () => {
    const f = features(single('standard', 1));
    expect(f).toEqual({
      jobs: false,
      video: false,
      teamMembers: false,
      reviewModeration: false,
      priorityPlacement: false,
      analytics: false,
    });
  });
});

describe('allowance', () => {
  it('reports remaining headroom', () => {
    expect(allowance(single('platinum', 5), 2)).toEqual({ paid: 5, used: 2, remaining: 3 });
    expect(allowance(single('platinum', 5), 5)).toEqual({ paid: 5, used: 5, remaining: 0 });
  });

  it('never reports negative headroom when over the limit', () => {
    expect(allowance(single('platinum', 5), 9)).toEqual({ paid: 5, used: 9, remaining: 0 });
  });

  it('treats an unpaid account as zero allowance', () => {
    expect(allowance({ planTier: 'standard', paidNurseryCount: 0 }, 0))
      .toEqual({ paid: 0, used: 0, remaining: 0 });
  });
});

describe('canAddNursery', () => {
  it('allows up to the paid count and no further', () => {
    expect(canAddNursery(single('standard', 1), 0)).toBe(true);
    expect(canAddNursery(single('standard', 1), 1)).toBe(false);
    expect(canAddNursery(single('platinum', 3), 2)).toBe(true);
    expect(canAddNursery(single('platinum', 3), 3)).toBe(false);
    expect(canAddNursery(single('platinum', 3), 4)).toBe(false);
  });

  it('blocks an unpaid account entirely', () => {
    expect(canAddNursery({ planTier: 'standard', paidNurseryCount: 0 }, 0)).toBe(false);
  });
});

describe('planFromMetadata', () => {
  it('reads a Single purchase back', () => {
    expect(planFromMetadata({ plan: 'standard', nurseryCount: '1' })).toEqual({
      tier: 'standard',
      count: 1,
    });
    expect(planFromMetadata({ plan: 'platinum', nurseryCount: '1' })).toEqual({
      tier: 'platinum',
      count: 1,
    });
  });

  it('reads a Group purchase back', () => {
    expect(planFromMetadata({ plan: 'platinum', nurseryCount: '8' })).toEqual({
      tier: 'platinum',
      count: 8,
    });
  });

  // Metadata comes back through Stripe, so it is untrusted. There is no
  // Standard group product; storing one would be a state pricing.ts could
  // never have quoted.
  it('forces platinum when the count makes it a group', () => {
    expect(planFromMetadata({ plan: 'standard', nurseryCount: '5' })).toEqual({
      tier: 'platinum',
      count: 5,
    });
  });

  it('never produces a combination pricing.ts would refuse', () => {
    for (const count of [1, 2, 5, 6, 15, 16, 30, 31, 60]) {
      for (const plan of ['standard', 'platinum', 'nonsense', undefined]) {
        const { tier, count: n } = planFromMetadata({ plan, nurseryCount: String(count) });
        expect(() => quote(tier, 'monthly', n)).not.toThrow();
      }
    }
  });

  it('falls back to one nursery on junk counts', () => {
    for (const raw of ['', 'abc', '0', '-3', '2.5', undefined]) {
      expect(planFromMetadata({ plan: 'platinum', nurseryCount: raw }).count).toBe(1);
    }
  });
});
