export type ActivationDecision =
  | { action: 'allow' }
  | { action: 'swap'; deactivateId: string }
  | { action: 'blocked'; conflictId: string };

/**
 * Pure function — testable without a database.
 *
 * limit null means unlimited. targetId is the job being created/updated; if
 * it is already in currentActiveIds, it is not counted as consuming a slot
 * (re-saving an active job is not a new activation). replaceId is the job
 * the user explicitly agreed to take down.
 */
export function decideActivation(opts: {
  limit: number | null;
  currentActiveIds: string[];
  targetId: string | null;
  replaceId: string | null;
}): ActivationDecision {
  const { limit, currentActiveIds, targetId, replaceId } = opts;

  // Unlimited — always allow.
  if (limit === null) return { action: 'allow' };

  // How many active jobs excluding the one being edited?
  const othersActive = targetId
    ? currentActiveIds.filter((id) => id !== targetId)
    : currentActiveIds;

  // Under the limit — allow.
  if (othersActive.length < limit) return { action: 'allow' };

  // At or over the limit. Is there a valid replacement?
  if (replaceId && currentActiveIds.includes(replaceId)) {
    return { action: 'swap', deactivateId: replaceId };
  }

  // No conflicting job found — nothing to block on.
  const conflictId = othersActive[0] ?? currentActiveIds[0];
  if (!conflictId) return { action: 'allow' };

  // Blocked. Return the first active job for the confirmation dialog.
  return { action: 'blocked', conflictId };
}
