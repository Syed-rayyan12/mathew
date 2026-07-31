import { describe, it, expect } from 'vitest';
import { decideActivation } from './active-job-limit';

describe('decideActivation', () => {
  it('allows anything when limit is null (unlimited)', () => {
    expect(
      decideActivation({ limit: null, currentActiveIds: ['a', 'b', 'c'], targetId: null, replaceId: null })
    ).toEqual({ action: 'allow' });
  });

  it('allows when under the limit', () => {
    expect(
      decideActivation({ limit: 1, currentActiveIds: [], targetId: null, replaceId: null })
    ).toEqual({ action: 'allow' });
  });

  it('blocks when at the limit with no replaceId', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['existing-job'],
      targetId: null,
      replaceId: null,
    });
    expect(result).toEqual({ action: 'blocked', conflictId: 'existing-job' });
  });

  it('swaps when at the limit with a valid replaceId', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['existing-job'],
      targetId: null,
      replaceId: 'existing-job',
    });
    expect(result).toEqual({ action: 'swap', deactivateId: 'existing-job' });
  });

  it('allows re-saving the already-active job (edit, not a new activation)', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['this-job'],
      targetId: 'this-job',
      replaceId: null,
    });
    expect(result).toEqual({ action: 'allow' });
  });

  it('rejects a replaceId that is not in the active list', () => {
    const result = decideActivation({
      limit: 1,
      currentActiveIds: ['existing-job'],
      targetId: null,
      replaceId: 'wrong-id',
    });
    expect(result).toEqual({ action: 'blocked', conflictId: 'existing-job' });
  });

  it('allows when limit is 0 and there are no active jobs (edge: should not happen, but safe)', () => {
    expect(
      decideActivation({ limit: 0, currentActiveIds: [], targetId: null, replaceId: null })
    ).toEqual({ action: 'allow' });
  });

  it('blocks when limit is 0 and there is an active job', () => {
    const result = decideActivation({
      limit: 0,
      currentActiveIds: ['a'],
      targetId: null,
      replaceId: null,
    });
    expect(result).toEqual({ action: 'blocked', conflictId: 'a' });
  });
});
