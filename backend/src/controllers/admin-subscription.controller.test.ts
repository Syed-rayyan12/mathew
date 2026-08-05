import { describe, it, expect } from 'vitest';
import { floorFor } from './admin-subscription.controller';

describe('scheduleCancellation floor', () => {
  it('is the term end when notice was served early in the term', () => {
    const termEnd = new Date('2027-01-01T00:00:00Z');
    expect(floorFor(termEnd, new Date('2026-03-01T00:00:00Z')).toISOString())
      .toBe(termEnd.toISOString());
  });

  it('is notice plus ninety days when that runs past the term', () => {
    const termEnd = new Date('2027-01-01T00:00:00Z');
    const served = new Date('2026-12-01T00:00:00Z');
    expect(floorFor(termEnd, served).toISOString())
      .toBe(new Date('2027-03-01T00:00:00Z').toISOString());
  });

  it('treats a missing notice date as notice served now', () => {
    const before = Date.now();
    const floor = floorFor(null, null);
    expect(floor.getTime()).toBeGreaterThanOrEqual(before + 89 * 864e5);
  });

  it('puts the floor beyond a mid-term date an admin might pick', () => {
    // The rejection branch compares `requested < floor`. This pins the input
    // that makes it fire: a term that has ten months to run.
    const termEnd = new Date('2027-01-01T00:00:00Z');
    const floor = floorFor(termEnd, new Date('2026-03-01T00:00:00Z'));
    expect(new Date('2026-06-01T00:00:00Z').getTime()).toBeLessThan(floor.getTime());
  });
});
