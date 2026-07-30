'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { authService, type ChangePreview } from '@/lib/api/auth';
import Link from 'next/link';
import NurseryCountPicker from '@/components/sharedComponents/nursery-count-picker';
import { useEntitlements } from '@/hooks/use-nursery-plan';
import { MIN_GROUP_SIZE, formatGbp, planLabel, priceFor } from '@/lib/pricing';

const PLATINUM_FEATURES = [
  'Volume discount — up to 40% off per nursery',
  'Nursery Group Page (for multiple branches)',
  'Unlimited Image Gallery',
  'Video on Nursery Profile',
  'Team Member Profiles (inc. qualifications & badges)',
  'Review Management (approve, reject, respond)',
  'Full Notification System',
  'Priority Placement in Search Results',
  'Dashboard Analytics (ratings, reviews, performance)',
];

/**
 * The two ways an account can be upgraded. They are separate because the two
 * columns behind them are separate: `tier` moves planTier at the count you
 * already pay for, `count` buys more nurseries at Platinum group rates.
 */
type UpgradeAxis = 'tier' | 'count';

function UpgradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const upgraded = searchParams.get('upgraded');
  const cancelled = searchParams.get('cancelled');

  const { data: entitlements, loading: entitlementsLoading } = useEntitlements();

  const [status, setStatus] = useState<
    'idle' | 'confirming' | 'verifying' | 'success' | 'error' | 'cancelled'
  >(cancelled ? 'cancelled' : upgraded && sessionId ? 'verifying' : 'idle');
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [newPlanLabel, setNewPlanLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [axis, setAxis] = useState<UpgradeAxis>('tier');
  const [nurseryCount, setNurseryCount] = useState<number>(MIN_GROUP_SIZE);

  const paidCount = entitlements?.paidNurseryCount ?? 1;
  const usedCount = entitlements?.allowance.used ?? 0;
  const isPlatinum = entitlements?.planTier === 'platinum';

  // The server refuses to sell an allowance below what is already live, so the
  // picker cannot offer one either.
  const countFloor = Math.max(usedCount, MIN_GROUP_SIZE);

  // Someone already on Platinum has nothing to gain from the tier axis, so
  // start them on the count axis instead. The picker starts one above what
  // they already pay for, which is what "add more" means.
  useEffect(() => {
    if (!entitlements) return;
    setAxis(entitlements.planTier === 'platinum' ? 'count' : 'tier');
    setNurseryCount(
      Math.max(
        entitlements.paidNurseryCount + 1,
        entitlements.allowance.used,
        MIN_GROUP_SIZE
      )
    );
  }, [entitlements?.planTier, entitlements?.paidNurseryCount, entitlements?.allowance.used]);

  // Both axes land on Platinum: a group of two or more is Platinum by
  // definition, and the tier axis exists to leave Standard behind.
  const targetCount = axis === 'tier' ? Math.max(paidCount, 1) : nurseryCount;
  const upgradeQuote = priceFor('platinum', billingPeriod, targetCount);
  const targetLabel = planLabel('platinum', targetCount);

  // Auto-verify when returning from Stripe with session_id
  useEffect(() => {
    if (upgraded && sessionId && status === 'verifying') {
      authService.verifyUpgradeSession(sessionId)
        .then(res => {
          if (res.success && res.data) {
            setNewPlanLabel(planLabel(res.data.planTier, res.data.paidNurseryCount));
            setStatus('success');
          } else {
            setErrorMsg(res.message || 'Verification failed. Please contact support.');
            setStatus('error');
          }
        })
        .catch((err: any) => {
          setErrorMsg(err?.message || 'Something went wrong. Please contact support.');
          setStatus('error');
        });
    }
  }, [upgraded, sessionId, status]);

  // Countdown then hard-redirect so all components re-mount with updated plan
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      window.location.href = '/nursery-dashboard';
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  // Step one of two. Asks the server what this actually costs right now.
  // A lapsed or never-subscribed account comes back `requiresCheckout` and
  // still goes to Stripe, because there is no card on file to charge.
  const handleUpgrade = async () => {
    // The button already says "Contact us for a quote" up here; without this
    // guard it POSTs anyway and the server rejects the unpriced group.
    if (upgradeQuote.bespoke) {
      router.push('/contact-us');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.previewChange('platinum', billingPeriod, targetCount);
      if (!res.success || !res.data) {
        setErrorMsg(res.message || 'Could not price that change. Please try again.');
        setStatus('error');
        return;
      }

      if (res.data.requiresCheckout) {
        const session = await authService.createUpgradeSession('platinum', billingPeriod, targetCount);
        if (session.url) {
          window.location.href = session.url;
        } else {
          setErrorMsg(session.message || 'The server did not return a payment link. Please try again.');
          setStatus('error');
        }
        return;
      }

      setPreview(res.data);
      setStatus('confirming');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not reach the server. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Step two. Charges the card on file. There is no redirect, so on success
  // the page goes straight to the state it would otherwise have returned to.
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await authService.applyChange('platinum', billingPeriod, targetCount);
      if (res.success && res.data) {
        setNewPlanLabel(planLabel(res.data.planTier, res.data.paidNurseryCount));
        setStatus('success');
      } else {
        setErrorMsg(res.message || 'The change could not be applied. Please try again.');
        setStatus('error');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not reach the server. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm state ──────────────────────────────────────────────
  // The one screen where the numbers are Stripe's rather than ours. Amount
  // due now is a proration and will not match the sticker price.
  if (status === 'confirming' && preview) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="rounded-2xl border border-yellow-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Confirm your upgrade</h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            You&apos;re moving to {preview.targetLabel}.
          </p>

          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
            <div className="flex items-baseline justify-between px-4 py-4">
              <span className="text-sm text-gray-600">Due today</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatGbp(preview.amountDueNowPence)}
              </span>
            </div>
            <div className="flex items-baseline justify-between px-4 py-4">
              <span className="text-sm text-gray-600">
                {billingPeriod === 'monthly' ? 'Then per month' : 'Then per year'}
              </span>
              <span className="text-base font-semibold text-gray-800">
                {formatGbp(preview.nextRenewalPence)}
              </span>
            </div>
            {preview.nextRenewalDate && (
              <div className="flex items-baseline justify-between px-4 py-4">
                <span className="text-sm text-gray-600">Next payment</span>
                <span className="text-base font-semibold text-gray-800">
                  {new Date(preview.nextRenewalDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-6">
            {preview.intervalChanges
              ? 'Changing your billing period restarts your billing cycle today, so this charge covers a full new period less credit for time you have already paid for.'
              : 'Today\u2019s charge covers the rest of your current billing period. Your renewal date does not change.'}
          </p>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Charging your card…</>
            ) : (
              <><Zap size={16} className="fill-yellow-900" /> Pay {formatGbp(preview.amountDueNowPence)} and upgrade</>
            )}
          </button>
          <button
            onClick={() => { setPreview(null); setStatus('idle'); }}
            disabled={loading}
            className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 transition disabled:opacity-60"
          >
            Back
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Charged to the card already on your account · 90 days notice required to cancel
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="text-green-500 w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          You&apos;re now on {newPlanLabel || 'your new plan'}!
        </h1>
        <p className="text-gray-500 max-w-sm text-sm">
          Your plan has been updated. Everything it covers is now unlocked.
        </p>
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-gray-500">Redirecting to dashboard in {countdown}s…</span>
        </div>
        <button
          onClick={() => { window.location.href = '/nursery-dashboard'; }}
          className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition"
        >
          Go to Dashboard Now
        </button>
      </div>
    );
  }

  // ── Verifying state ────────────────────────────────────────────
  if (status === 'verifying') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-600 font-medium">Confirming your payment…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="text-red-500 w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-gray-500 max-w-sm text-sm">{errorMsg}</p>
        <button
          onClick={() => setStatus('idle')}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Cancelled state ────────────────────────────────────────────
  if (status === 'cancelled') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
          <XCircle className="text-yellow-500 w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="text-gray-500 max-w-sm text-sm">
          Your upgrade was cancelled. No payment was taken. You can upgrade any time from this page.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Idle state (default upgrade page) ─────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href="/nursery-dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-8 transition"
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* Card */}
      <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-700">Plan Upgrade</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Upgrade to {targetLabel}</h1>
        <p className="text-gray-500 text-sm mt-1 mb-5">
          Upgrade your existing account — no new account needed.
        </p>

        {/* Where the account stands today */}
        <div className="rounded-xl border border-yellow-200 bg-white/70 px-4 py-3 mb-6 text-sm">
          {entitlementsLoading ? (
            <span className="text-gray-400">Loading your plan…</span>
          ) : entitlements ? (
            <>
              <p className="font-semibold text-gray-800">
                Your plan: {entitlements.planLabel}
              </p>
              <p className="text-gray-500 mt-0.5">
                {usedCount} of {paidCount} {paidCount === 1 ? 'nursery' : 'nurseries'} used
              </p>
            </>
          ) : (
            <span className="text-gray-400">We couldn&apos;t load your current plan.</span>
          )}
        </div>

        {/* The two upgrade axes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setAxis('tier')}
            disabled={isPlatinum}
            className={`text-left rounded-xl border p-4 transition disabled:opacity-50 disabled:cursor-not-allowed ${
              axis === 'tier' ? 'border-yellow-400 bg-white shadow-sm' : 'border-gray-200 bg-white/60 hover:border-yellow-300'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Unlock Platinum features</p>
            <p className="text-xs text-gray-500 mt-1">
              {isPlatinum
                ? 'Already included in your plan.'
                : `Keep your ${paidCount === 1 ? 'nursery' : `${paidCount} nurseries`}, add every Platinum feature.`}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAxis('count')}
            className={`text-left rounded-xl border p-4 transition ${
              axis === 'count' ? 'border-yellow-400 bg-white shadow-sm' : 'border-gray-200 bg-white/60 hover:border-yellow-300'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Add more nurseries</p>
            <p className="text-xs text-gray-500 mt-1">
              Two or more nurseries become a Group, at a volume discount.
            </p>
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              billingPeriod === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              billingPeriod === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Annual
          </button>
        </div>

        {/* Price — Group is per nursery and banded, so it depends on the count */}
        <div className="flex items-end gap-2 mb-1">
          <span className="text-4xl font-bold text-gray-900">
            {upgradeQuote.bespoke ? 'POA' : formatGbp(upgradeQuote.totalPence)}
          </span>
          <span className="text-gray-400 text-sm pb-1">
            {upgradeQuote.bespoke
              ? 'priced individually'
              : billingPeriod === 'monthly'
                ? `/ month for ${targetCount} ${targetCount === 1 ? 'nursery' : 'nurseries'}`
                : '/ year paid upfront'}
          </span>
        </div>
        {!upgradeQuote.bespoke && billingPeriod === 'annual' && (
          <p className="text-xs text-green-600 font-medium mb-2">
            Equivalent to {formatGbp(priceFor('platinum', 'monthly', targetCount).totalPence)}/month
          </p>
        )}

        {axis === 'count' && (
          <div className="mb-5 mt-4">
            <NurseryCountPicker
              count={nurseryCount}
              onChange={setNurseryCount}
              billing={billingPeriod}
              min={countFloor}
              footnote={
                usedCount > MIN_GROUP_SIZE
                  ? `A Group covers two or more nurseries, and the per-nursery price drops as the group grows. You have ${usedCount} live, so your plan cannot go below that — remove nurseries first if you want a smaller plan.`
                  : 'A Group covers two or more nurseries. The per-nursery price drops as the group grows.'
              }
            />
          </div>
        )}

        {/* Features */}
        <ul className="space-y-3 mb-8 mt-6">
          {PLATINUM_FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading || entitlementsLoading}
          className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Checking your price…</>
          ) : (
            <><Zap size={16} className="fill-yellow-900" /> {upgradeQuote.bespoke
              ? 'Contact us for a quote'
              : `Review upgrade — ${formatGbp(upgradeQuote.totalPence)}/${billingPeriod === 'monthly' ? 'mo' : 'yr'}`}</>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment via Stripe · Recurring payment · 90 days notice required to cancel
        </p>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
