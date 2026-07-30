import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_NURSERY_WHERE, PUBLIC_GROUP_WHERE, PUBLIC_JOB_WHERE } from './public-visibility';

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

// ── Group visibility ─────────────────────────────────────────────────────────

describe('PUBLIC_GROUP_WHERE', () => {
  it('gates on isActive', () => {
    expect(PUBLIC_GROUP_WHERE.isActive).toBe(true);
  });

  it('accepts an owner who is live, or an admin', () => {
    expect(PUBLIC_GROUP_WHERE.owner.OR).toEqual([
      { role: 'ADMIN' },
      { subscriptionStatus: { in: ['active', 'trialing', 'past_due'] } },
    ]);
  });
});

describe('user.nursery.controller.ts — group queries', () => {
  const queriesGroups = (body: string): boolean =>
    /\.group\.(findMany|findFirst|findUnique|count)/.test(body);

  it('finds the public group queries at all, so this test cannot pass vacuously', () => {
    const withQueries = exportedBlocks(source).filter((b) => queriesGroups(b.body));
    expect(withQueries.length).toBeGreaterThanOrEqual(4);
  });

  it('uses the shared filter in every public group query', () => {
    const offenders = exportedBlocks(source)
      .filter((b) => queriesGroups(b.body))
      .filter(
        (b) =>
          (b.body.match(/PUBLIC_GROUP_WHERE/g) ?? []).length < 1
      )
      .map((b) => b.name);

    expect(
      offenders,
      'These queries hand-roll their own group filter. A lapsed owner\u2019s ' +
        'group page stays live through every one of them.'
    ).toEqual([]);
  });
});

// ── Job visibility ────────────────────────────────────────────────────────────

describe('PUBLIC_JOB_WHERE', () => {
  it('gates on isActive', () => {
    expect(PUBLIC_JOB_WHERE.isActive).toBe(true);
  });

  it('admits a null poster (platform-posted adverts and deleted-account adverts)', () => {
    const nullArm = PUBLIC_JOB_WHERE.OR[0] as { postedBy: { is: null } };
    expect(nullArm.postedBy.is).toBeNull();
  });

  it('admits an ADMIN poster', () => {
    const posterArm = PUBLIC_JOB_WHERE.OR[1] as {
      postedBy: { is: { OR: { role?: string }[] } };
    };
    const adminClause = posterArm.postedBy.is.OR.find((c) => c.role === 'ADMIN');
    expect(adminClause).toBeDefined();
  });

  it('requires a live subscription AND (platinum OR live add-on) for a paying poster', () => {
    const posterArm = PUBLIC_JOB_WHERE.OR[1] as {
      postedBy: { is: { OR: any[] } };
    };
    const payingClause = posterArm.postedBy.is.OR.find(
      (c: any) => c.subscriptionStatus !== undefined
    );
    expect(payingClause).toBeDefined();
    expect(payingClause!.subscriptionStatus!.in).toEqual(['active', 'trialing', 'past_due']);
    // Must be platinum OR have a live add-on
    const platinumArm = payingClause!.OR.find((c: any) => c.planTier === 'platinum');
    expect(platinumArm).toBeDefined();
    const addonArm = payingClause!.OR.find((c: any) => c.jobsAddonStatus !== undefined);
    expect(addonArm).toBeDefined();
    expect(addonArm!.jobsAddonStatus!.in).toEqual(['active', 'trialing', 'past_due']);
  });

  it('admits a paying poster with a live add-on on standard tier', () => {
    const posterArm = PUBLIC_JOB_WHERE.OR[1] as {
      postedBy: { is: { OR: any[] } };
    };
    const payingClause = posterArm.postedBy.is.OR.find(
      (c: any) => c.subscriptionStatus !== undefined
    );
    // The paying arm now has a nested OR: platinum OR add-on live
    expect(payingClause!.OR).toBeDefined();
    const addonClause = payingClause!.OR.find(
      (c: any) => c.jobsAddonStatus !== undefined
    );
    expect(addonClause).toBeDefined();
    expect(addonClause!.jobsAddonStatus!.in).toEqual(['active', 'trialing', 'past_due']);
  });
});

describe('job.controller.ts', () => {
  const jobSource = readFileSync(
    join(process.cwd(), 'src/controllers/job.controller.ts'),
    'utf8'
  );

  const queriesJobs = (body: string): boolean =>
    /\.job\.(findMany|findFirst|findUnique|count)/.test(body);

  it('finds the public job queries at all, so this test cannot pass vacuously', () => {
    const withQueries = exportedBlocks(jobSource).filter((b) => queriesJobs(b.body));
    expect(withQueries.length).toBeGreaterThanOrEqual(2);
  });

  it('uses the shared filter in every public job query', () => {
    const offenders = exportedBlocks(jobSource)
      .filter((b) => queriesJobs(b.body))
      .filter((b) => (b.body.match(/PUBLIC_JOB_WHERE/g) ?? []).length < 1)
      .map((b) => b.name);

    expect(
      offenders,
      'These queries hand-roll their own job filter. A lapsed or downgraded ' +
        "owner's adverts stay live and applications go into a black hole."
    ).toEqual([]);
  });
});
