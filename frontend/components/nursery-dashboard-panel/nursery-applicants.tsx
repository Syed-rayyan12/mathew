'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, ChevronDown, Mail, Phone, FileText, Clock, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { jobService, JobApplication } from '@/lib/api/jobs'
import { useNurseryPlan } from '@/hooks/use-nursery-plan'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED']

const STATUS_BADGE: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  REVIEWED:    'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-green-100 text-green-700',
  REJECTED:    'bg-red-100 text-red-700',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NurseryApplicants() {
  const plan = useNurseryPlan()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    jobService.nurseryGetApplications()
      .then(res => { if (res.success && res.data) setApplications(res.data) })
      .catch(() => toast.error('Failed to load applicants'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (plan !== 'platinum') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-10 max-w-md">
          <Lock size={40} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Platinum Plan Required</h2>
          <p className="text-gray-500 text-sm mb-6">
            Applicant management is available exclusively on the <strong>Platinum</strong> plan.
            Upgrade to review and manage job applications.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm"
          >
            View Pricing
          </Link>
        </div>
      </div>
    )
  }

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const res = await jobService.nurseryUpdateApplicationStatus(id, status)
      if (res.success) {
        toast.success('Status updated')
        setApplications(prev => prev.map(a => a.id === id ? { ...a, status: status as JobApplication['status'] } : a))
      } else {
        toast.error(res.message || 'Failed to update status')
      }
    } catch { toast.error('Failed to update status') }
    finally { setUpdating(null) }
  }

  const filtered = applications.filter(a => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.job?.title ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const counts = STATUS_OPTIONS.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Applicants</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage applications for your posted jobs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATUS_OPTIONS.slice(1).map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s}</p>
            <p className={`text-2xl font-bold mt-1 ${s === 'SHORTLISTED' ? 'text-green-600' : s === 'REJECTED' ? 'text-red-500' : s === 'REVIEWED' ? 'text-blue-600' : 'text-yellow-600'}`}>
              {counts[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or job..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No applications found</p>
            <p className="text-sm mt-1">{applications.length === 0 ? 'No one has applied to your jobs yet.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(app => (
              <div key={app.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: applicant info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{app.fullName}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[app.status]}`}>
                        {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="text-sm text-primary font-medium mt-0.5">{app.job?.title} — {app.job?.department}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Mail size={11} />{app.email}</span>
                      {app.phone && <span className="flex items-center gap-1"><Phone size={11} />{app.phone}</span>}
                      <span className="flex items-center gap-1"><Clock size={11} />{formatDate(app.createdAt)}</span>
                    </div>
                  </div>

                  {/* Right: status change + expand */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select
                      value={app.status}
                      onValueChange={val => handleStatusChange(app.id, val)}
                      disabled={updating === app.id}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.slice(1).map(s => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    >
                      <ChevronDown size={16} className={`transition-transform ${expanded === app.id ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded: cover letter */}
                {expanded === app.id && app.coverLetter && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FileText size={12} /> Cover Letter
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{app.coverLetter}</p>
                  </div>
                )}
                {expanded === app.id && !app.coverLetter && (
                  <p className="mt-3 text-sm text-gray-400 italic">No cover letter provided.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
