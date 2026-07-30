import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
} from './pricing';

// process.cwd(), not __dirname — vitest transforms to ESM, where __dirname
// does not exist regardless of what tsconfig says. Vitest runs from backend/.
const source = readFileSync(
  join(process.cwd(), '../frontend/lib/pricing.ts'),
  'utf8'
);

const constant = (name: string): number => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  expect(match, `${name} not found in frontend/lib/pricing.ts`).not.toBeNull();
  return Number(match![1]);
};

describe('frontend pricing mirror', () => {
  it('has the same single rates', () => {
    expect(constant('SINGLE_STANDARD_MONTHLY_PENCE')).toBe(SINGLE_STANDARD_MONTHLY_PENCE);
    expect(constant('SINGLE_PLATINUM_MONTHLY_PENCE')).toBe(SINGLE_PLATINUM_MONTHLY_PENCE);
  });

  it('has the same group bands', () => {
    const re =
      /\{\s*min:\s*(\d+),\s*max:\s*(\d+),\s*unitPence:\s*(\d+),\s*discountPercent:\s*(\d+)\s*\}/g;
    const found = [...source.matchAll(re)].map((m) => ({
      min: Number(m[1]),
      max: Number(m[2]),
      unitPence: Number(m[3]),
      discountPercent: Number(m[4]),
    }));

    expect(found).toEqual(GROUP_BANDS.map((b) => ({ ...b })));
  });
});
