'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  nurseryDashboardService,
  type Entitlements,
  type PlanFeatureFlags,
} from '@/lib/api/nursery';

export type { Entitlements, PlanFeatureFlags };

export type NurseryPlan = 'standard' | 'platinum';

const EMPTY_ALLOWANCE = { paid: 0, used: 0, remaining: 0 };

/**
 * Module-level cache so a page with a sidebar, a list and a modal makes one
 * request rather than three, and so a soft navigation does not flash the
 * locked UI at an owner who has already been resolved.
 */
let cache: Entitlements | null = null;
let inflight: Promise<Entitlements | null> | null = null;
const listeners = new Set<(value: Entitlements | null) => void>();

async function load(force = false): Promise<Entitlements | null> {
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await nurseryDashboardService.getEntitlements();
      cache = res.success && res.data ? res.data : null;
    } catch {
      // Not signed in, or the server is unreachable. Leave the cache empty —
      // every real gate lives on the server, so the worst case is a locked
      // view plus a 403 if the user pushes through it.
      cache = null;
    } finally {
      inflight = null;
    }
    listeners.forEach((notify) => notify(cache));
    return cache;
  })();

  return inflight;
}

export interface UseEntitlements {
  data: Entitlements | null;
  /** True until the first response lands. Render a neutral state, not a locked one. */
  loading: boolean;
  /** Re-read from the server, e.g. after adding a nursery changes `allowance.used`. */
  refresh: () => void;
}

export function useEntitlements(): UseEntitlements {
  const [data, setData] = useState<Entitlements | null>(cache);
  const [loading, setLoading] = useState<boolean>(cache === null);

  useEffect(() => {
    let alive = true;

    const notify = (value: Entitlements | null) => {
      if (!alive) return;
      setData(value);
      setLoading(false);
    };
    listeners.add(notify);

    load().then(() => {
      if (alive) setLoading(false);
    });

    // Returning to the tab after a Stripe redirect is the common case where
    // the plan has changed underneath us.
    const onFocus = () => {
      void load(true);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      alive = false;
      listeners.delete(notify);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const refresh = useCallback(() => {
    void load(true);
  }, []);

  return { data, loading, refresh };
}

/** Thin wrapper for call sites that only need the tier name. */
export function useNurseryPlan(): NurseryPlan {
  const { data } = useEntitlements();
  return data?.planTier ?? 'standard';
}

export function usePlanFeatures() {
  const { data, loading, refresh } = useEntitlements();
  const features = data?.features;
  const allowance = data?.allowance ?? EMPTY_ALLOWANCE;

  /**
   * The server reports what was bought and whether it is paid for as two
   * separate answers, and expects the caller to combine them: `features`
   * describes the purchased tier alone, while `requireFeature` 403s
   * SUBSCRIPTION_INACTIVE before it ever reaches the feature check. Ungated,
   * a lapsed Platinum owner would see the whole Platinum dashboard and get a
   * 403 from every button on it.
   *
   * Unknown is never treated as paid, matching isLive() on the server.
   */
  const live = data?.isLive ?? false;

  return {
    // Deliberately not live-gated. These describe the plan the owner bought,
    // which is what the billing banner needs in order to say "your Group of 8
    // has lapsed" rather than demoting them to a plan they never held.
    plan: data?.planTier ?? ('standard' as NurseryPlan),
    planLabel: data?.planLabel ?? 'Single Standard',
    isGroup: data?.isGroup ?? false,
    loading,
    refresh,
    canPostJobs: live && (features?.jobs ?? false),
    canUploadVideo: live && (features?.video ?? false),
    canManageTeamMembers: live && (features?.teamMembers ?? false),
    canApproveRejectReviews: live && (features?.reviewModeration ?? false),
    allowance,
    /** The server 403s on the way past this; it only saves a round trip. */
    canAddNursery: live && allowance.remaining > 0,
    // The billing state itself, so a call site can tell "you have never
    // subscribed" apart from "your plan has ended" and word its prompt to
    // match.
    isLive: live,
    subscriptionStatus: data?.subscriptionStatus ?? 'none',
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    cancelAt: data?.cancelAt ?? null,
  };
}
