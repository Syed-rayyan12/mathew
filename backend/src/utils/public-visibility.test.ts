import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_NURSERY_WHERE } from './public-visibility';

// process.cwd(), not __dirname — vitest transforms to ESM, where __dirname
// does not exist regardless of what tsconfig says. Vitest runs from backend/.
const source = readFileSync(
  join(process.cwd(), 'src/controllers/user.nursery.controller.ts'),
  'utf8'
);

/**
 * The one public nursery query that deliberately omits the filter.
 *
 * searchNurseries backs the "leave a review" flow. A parent must be able to
 * review any nursery they attended, and a review cannot be blocked because the
 * owner stopped paying.
 */
const ALLOWED_WITHOUT_FILTER = new Set(['searchNurseries']);

/**
 * Blocks that filter nurseries in more than one place, and how many.
 *
 * Presence of the fragment anywhere in a block is not enough for these:
 * searchByCity filters twice — once for the nurseries counted on each group,
 * once for the nursery list itself — so dropping either one would still leave
 * the other's mention behind and the presence check would pass regardless.
 */
const FILTER_SITES: Record<string, number> = { searchByCity: 2 };

interface Block {
  name: string;
  body: string;
}

function exportedBlocks(src: string): Block[] {
  return src
    .split(/^export const /m)
    .slice(1)
    .map((part) => ({ name: part.split(/[^A-Za-z0-9_]/)[0], body: part }));
}

const queriesNurseries = (body: string): boolean =>
  /\.nursery\.(findMany|findFirst|findUnique|count)/.test(body);

describe('PUBLIC_NURSERY_WHERE', () => {
  it('requires approval', () => {
    expect(PUBLIC_NURSERY_WHERE.isApproved).toBe(true);
  });

  it('accepts an owner who is live, or an admin', () => {
    expect(PUBLIC_NURSERY_WHERE.owner.OR).toEqual([
      { role: 'ADMIN' },
      { subscriptionStatus: { in: ['active', 'trialing', 'past_due'] } },
    ]);
  });
});

describe('user.nursery.controller.ts', () => {
  it('finds the public queries at all, so this test cannot pass vacuously', () => {
    const withQueries = exportedBlocks(source).filter((b) => queriesNurseries(b.body));
    expect(withQueries.length).toBeGreaterThanOrEqual(4);
  });

  it('uses the shared filter in every public nursery query', () => {
    const offenders = exportedBlocks(source)
      .filter((b) => queriesNurseries(b.body))
      .filter((b) => !ALLOWED_WITHOUT_FILTER.has(b.name))
      .filter(
        (b) =>
          (b.body.match(/PUBLIC_NURSERY_WHERE/g) ?? []).length <
          (FILTER_SITES[b.name] ?? 1)
      )
      .map((b) => b.name);

    expect(
      offenders,
      'These queries hand-roll their own filter. A lapsed owner stays on the ' +
        'site through every one of them.'
    ).toEqual([]);
  });

  it('never counts nurseries on a group without the filter', () => {
    expect(source).not.toMatch(/nurseries:\s*\{\s*where:\s*\{\s*isApproved/);
  });

  it('keeps the documented exception, so the allowlist cannot rot', () => {
    for (const name of ALLOWED_WITHOUT_FILTER) {
      expect(source, `${name} is allowlisted but no longer exists`).toContain(
        `export const ${name}`
      );
    }
  });

  it('does not look a nursery up by slug alone', () => {
    expect(
      source,
      'findUnique cannot take a relation filter. getNurseryBySlug must use ' +
        'findFirst, or the detail page stays indexed after a lapse.'
    ).not.toMatch(/findUnique\(\{\s*where:\s*\{\s*slug\s*\}/);
  });
});
