'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '@/lib/api/auth';
import Link from 'next/link';

const PLATINUM_FEATURES = [
  'Unlimited Nursery Locations',
  'Nursery Group Page (for multiple branches)',
  'Unlimited Image Gallery',
  'Video on Nursery Profile',
  'Team Member Profiles (inc. qualifications & badges)',
  'Review Management (approve, reject, respond)',
  'Full Notification System',
  'Priority Placement in Search Results',
  'Dashboard Analytics (ratings, reviews, performance)',
];

function UpgradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const upgraded = searchParams.get('upgraded');
  const cancelled = searchParams.get('cancelled');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'cancelled'>(
    cancelled ? 'cancelled' : upgraded && sessionId ? 'verifying' : 'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Auto-verify when returning from Stripe with session_id
  useEffect(() => {
    if (upgraded && sessionId && status === 'verifying') {
      authService.verifyUpgradeSession(sessionId)
        .then(res => {
          if (res.success) {
            setStatus('success');
          } else {
            setErrorMsg(res.message || 'Verification failed. Please contact support.');
            setStatus('error');
          }
        })
        .catch(() => {
          setErrorMsg('Something went wrong. Please contact support.');
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

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nurseryAccessToken');
      const user = localStorage.getItem('nurseryUser');
      console.log('🔑 nurseryAccessToken:', token ? token.slice(0, 30) + '...' : 'MISSING');
      console.log('👤 nurseryUser:', user ? JSON.parse(user) : 'MISSING');

      const url = 'https://mathew-production.up.railway.app/api/stripe/create-upgrade-session';
      console.log('📤 Sending POST to:', url);

      const rawRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: 'platinum' }),
      });

      const rawBody = await rawRes.text();
      console.log('📡 HTTP Status:', rawRes.status, rawRes.statusText);
      console.log('📡 Raw body:', rawBody);

      // Parse JSON safely
      let json: any = {};
      try { json = JSON.parse(rawBody); } catch {
        setErrorMsg(`Server returned non-JSON response (status ${rawRes.status}). The backend may not be deployed yet.`);
        setStatus('error');
        return;
      }

      if (rawRes.ok && json.success && json.url) {
        window.location.href = json.url;
      } else {
        setErrorMsg(`Error ${rawRes.status}: ${json.message || 'Unknown error from server'}`);
        setStatus('error');
      }
    } catch (err: any) {
      console.error('❌ Network-level error (fetch never sent or CORS blocked):', err);
      setErrorMsg(`Network error: ${err?.message || 'Could not reach the server. Check console for details.'}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="text-green-500 w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">You're now on Platinum!</h1>
        <p className="text-gray-500 max-w-sm text-sm">
          Your plan has been upgraded. All Platinum features are now unlocked.
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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Upgrade to Platinum</h1>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          One-time upgrade — no new account needed. Your existing nursery stays intact.
        </p>

        {/* Price */}
        <div className="flex items-end gap-2 mb-6">
          <span className="text-4xl font-bold text-gray-900">£38.60</span>
          <span className="text-gray-400 text-sm pb-1">/ month per nursery group</span>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
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
          disabled={loading}
          className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Redirecting to payment…</>
          ) : (
            <><Zap size={16} className="fill-yellow-900" /> Upgrade Now — £38.60</>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment via Stripe. You can cancel anytime.
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
