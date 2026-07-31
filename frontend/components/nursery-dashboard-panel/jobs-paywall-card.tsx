'use client'

import Link from 'next/link'
import { Lock, Briefcase, ArrowRight } from 'lucide-react'
import { JOBS_ADDON_MONTHLY_PENCE, JOBS_ADDON_MINIMUM_MONTHS, formatGbp } from '@/lib/pricing'
import { nurseryDashboardService } from '@/lib/api/nursery'
import { toast } from 'sonner'
import { useState } from 'react'

interface JobsPaywallCardProps {
  canPurchaseAddon: boolean
}

export default function JobsPaywallCard({ canPurchaseAddon }: JobsPaywallCardProps) {
  const [loading, setLoading] = useState(false)

  const handleAddonCheckout = async () => {
    setLoading(true)
    try {
      const res = await nurseryDashboardService.jobsAddonCheckout()
      if (res.success && res.data?.url) {
        window.location.href = res.data.url
      } else {
        toast.error((res as any).message || 'Failed to start checkout')
        setLoading(false)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong')
      setLoading(false)
    }
  }

  if (!canPurchaseAddon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-10 max-w-md">
          <Lock size={40} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Platinum Plan Required</h2>
          <p className="text-gray-500 text-sm mb-6">
            Job posting is available on the <strong>Platinum</strong> plan —
            Single Platinum or Group. Upgrade to post jobs and receive
            applications directly from the website.
          </p>
          <Link
            href="/nursery-dashboard/upgrade"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm"
          >
            Upgrade my plan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-lg w-full space-y-6">
        <Briefcase size={40} className="text-primary mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Post jobs from your nursery</h2>
        <p className="text-gray-500 text-sm">
          Advertise vacancies and receive applications directly on the site.
        </p>

        {/* Add-on offer */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Jobs add-on</h3>
            <span className="text-lg font-bold text-primary">{formatGbp(JOBS_ADDON_MONTHLY_PENCE)}/mo</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>One live advert at a time</li>
            <li>Receive applications via the website</li>
            <li>Minimum {JOBS_ADDON_MINIMUM_MONTHS} months</li>
          </ul>
          <button
            onClick={handleAddonCheckout}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm disabled:opacity-50"
          >
            {loading ? 'Redirecting...' : 'Add job posting'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </div>

        {/* Platinum alternative */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs text-gray-400 mb-3">Or unlock unlimited adverts and everything else</p>
          <Link
            href="/nursery-dashboard/upgrade"
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
          >
            Compare plans <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
