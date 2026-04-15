'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronDown, Mail, Phone, FileText, Clock, Filter } from 'lucide-react'
import { jobService, Job, JobApplication } from '@/lib/api/jobs'
import { toast } from 'sonner'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED'] as const
type StatusFilter = typeof STATUS_OPTIONS[number]

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  REVIEWED: 'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

interface CoverLetterModalProps {
  text: string
  applicantName: string
  onClose: () => void
}

function CoverLetterModal({ text, applicantName, onClose }: CoverLetterModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900">Cover Letter — {applicantName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-xl font-bold">&times;</button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  )
}

export default function ManageApplicants() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [jobFilter, setJobFilter] = useState<string>('ALL')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<{ text: string; name: string } | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, jobsRes] = await Promise.all([
        jobService.adminGetApplications(),
        jobService.adminGetAllJobs(),
      ])
      if (appsRes.success && appsRes.data) setApplications(appsRes.data)
      if (jobsRes.success && jobsRes.data) setJobs(jobsRes.data)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load applicants')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await jobService.adminUpdateApplicationStatus(id, newStatus)
      if (res.success) {
        setApplications(prev =>
          prev.map(a => a.id === id ? { ...a, status: newStatus as JobApplication['status'] } : a)
        )
        toast.success(`Status updated to ${STATUS_LABEL[newStatus]}`)
      } else {
        toast.error(res.message || 'Failed to update status')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = applications.filter(a => {
    const statusMatch = statusFilter === 'ALL' || a.status === statusFilter
    const jobMatch = jobFilter === 'ALL' || a.jobId === jobFilter
    return statusMatch && jobMatch
  })

  const counts = {
    PENDING: applications.filter(a => a.status === 'PENDING').length,
    REVIEWED: applications.filter(a => a.status === 'REVIEWED').length,
    SHORTLISTED: applications.filter(a => a.status === 'SHORTLISTED').length,
    REJECTED: applications.filter(a => a.status === 'REJECTED').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applicant Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and manage job applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(counts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as StatusFilter)}
            className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${
              statusFilter === status ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'
            }`}
          >
            <p className="text-xs text-gray-500">{STATUS_LABEL[status]}</p>
            <p className={`text-2xl font-bold mt-1 ${
              status === 'PENDING' ? 'text-yellow-600' :
              status === 'REVIEWED' ? 'text-blue-600' :
              status === 'SHORTLISTED' ? 'text-green-600' :
              'text-red-600'
            }`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={15} />
          <span>Filter:</span>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                statusFilter === s
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {s === 'ALL' ? 'All Statuses' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Job filter */}
        {jobs.length > 0 && (
          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Jobs</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium text-gray-500">No applications found</p>
            <p className="text-sm mt-1">
              {applications.length === 0 ? 'No one has applied yet.' : 'Try changing the filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Applicant</th>
                  <th className="text-left px-6 py-3">Applied For</th>
                  <th className="text-left px-6 py-3">Contact</th>
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Cover Letter</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{app.fullName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{app.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {app.job ? (
                        <>
                          <p className="font-medium text-gray-800">{app.job.title}</p>
                          <p className="text-xs text-gray-400">{app.job.department}</p>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail size={11} /> {app.email}
                        </span>
                        {app.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone size={11} /> {app.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} /> {formatDate(app.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {app.coverLetter ? (
                        <button
                          onClick={() => setCoverLetter({ text: app.coverLetter!, name: app.fullName })}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                        >
                          <FileText size={13} /> View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={app.status}
                          onChange={e => handleStatusChange(app.id, e.target.value)}
                          disabled={updatingId === app.id}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 pr-5 ${STATUS_BADGE[app.status]} ${updatingId === app.id ? 'opacity-50' : ''}`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="REVIEWED">Reviewed</option>
                          <option value="SHORTLISTED">Shortlisted</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        {updatingId === app.id && (
                          <Loader2 size={12} className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total shown */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Showing {filtered.length} of {applications.length} applications
        </p>
      )}

      {/* Cover letter modal */}
      {coverLetter && (
        <CoverLetterModal
          text={coverLetter.text}
          applicantName={coverLetter.name}
          onClose={() => setCoverLetter(null)}
        />
      )}
    </div>
  )
}
