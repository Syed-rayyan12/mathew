'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, Filter, Eye, Mail, Phone, FileText, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { jobService, Job, JobApplication } from '@/lib/api/jobs'
import { toast } from 'sonner'

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

interface ViewModalProps {
  app: JobApplication
  onClose: () => void
  onStatusChange: (id: string, status: string) => Promise<void>
  updatingId: string | null
}

function ViewModal({ app, onClose, onStatusChange, updatingId }: ViewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex bg-white items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{app.fullName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Applied for <span className="text-gray-600 font-medium">{app.job?.title ?? 'Unknown'}</span>
              {app.job?.department && <> · {app.job.department}</>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact Details</p>
            <div className="space-y-2">
              <a
                href={`mailto:${app.email}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition group"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-blue-600 group-hover:underline">{app.email}</p>
                </div>
              </a>
              {app.phone && (
                <a
                  href={`tel:${app.phone}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition group"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-green-600 group-hover:underline">{app.phone}</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {app.job && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Position</p>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                <p className="font-semibold">{app.job.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{app.job.department} · {app.job.location}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Applied On</p>
            <p className="text-sm text-gray-700">{formatDate(app.createdAt)}</p>
          </div>

          {app.coverLetter && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Cover Letter</p>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {app.coverLetter}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STATUS_LABEL).map(s => (
                <button
                  key={s}
                  disabled={updatingId === app.id}
                  onClick={() => onStatusChange(app.id, s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                    app.status === s
                      ? `${STATUS_BADGE[s]} border-transparent`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <a
            href={`mailto:${app.email}?subject=Your application for ${app.job?.title ?? 'the position'}`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition text-sm"
          >
            <Mail size={15} /> Send Email to Applicant
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ManageApplicants() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [viewApp, setViewApp] = useState<JobApplication | null>(null)

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
        setViewApp(prev => prev?.id === id ? { ...prev, status: newStatus as JobApplication['status'] } : prev)
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
    const statusMatch = statusFilter === 'all' || a.status === statusFilter
    const jobMatch = jobFilter === 'all' || a.jobId === jobFilter
    const searchMatch =
      !searchQuery ||
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
    return statusMatch && jobMatch && searchMatch
  })

  return (
    <div className="w-full">

      {/* HEADER */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
              <span className="text-foreground">MANAGE</span> Applicants
            </h2>
            <p className="text-gray-600">Review, contact and manage all job applications</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center min-w-[70px]">
              <p className="text-yellow-700 font-bold text-xl">{applications.filter(a => a.status === 'PENDING').length}</p>
              <p className="text-yellow-600 text-xs">Pending</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center min-w-[70px]">
              <p className="text-green-700 font-bold text-xl">{applications.filter(a => a.status === 'SHORTLISTED').length}</p>
              <p className="text-green-600 text-xs">Shortlisted</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center min-w-[70px]">
              <p className="text-blue-700 font-bold text-xl">{applications.length}</p>
              <p className="text-blue-600 text-xs">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="w-full bg-white p-4 rounded-lg flex flex-wrap items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10 rounded-sm"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] flex items-center gap-2 rounded-sm border border-secondary bg-white px-3 py-2 text-sm">
            <Filter className="h-4 w-4 pointer-events-none text-secondary" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {jobs.length > 0 && (
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-[200px] rounded-sm border border-secondary bg-white px-3 py-2 text-sm">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!loading && (
          <span className="ml-auto text-sm text-gray-400">
            {filtered.length} of {applications.length} applicants
          </span>
        )}
      </div>

      {/* TABLE */}
      <div className="shadow-md p-4 bg-white rounded-lg">
        <h2 className="font-sans font-bold text-xl">All Applicants</h2>
        <p className="text-gray-500">Click View to see full details and reach out directly by email or phone.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <div className="w-full mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                  <th className="p-3 text-left" style={{ borderRadius: '4px 0px 0px 4px' }}>Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Applied For</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Cover Letter</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left" style={{ borderRadius: '0px 4px 4px 0px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex justify-center w-full">
                        <span className="block text-center py-10 text-gray-500">
                          {applications.length === 0
                            ? 'No applications received yet.'
                            : 'No applicants match your filters.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(app => (
                    <tr key={app.id} className="border-b hover:bg-gray-50">
                      <td className="py-5 px-3 font-bold">{app.fullName}</td>
                      <td className="py-5 px-3">
                        <a
                          href={`mailto:${app.email}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          {app.email}
                        </a>
                      </td>
                      <td className="py-5 px-3">
                        {app.phone ? (
                          <a
                            href={`tel:${app.phone}`}
                            className="flex items-center gap-1 text-green-600 hover:underline text-sm"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            {app.phone}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-5 px-3">
                        {app.job ? (
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{app.job.title}</p>
                            <p className="text-xs text-gray-400">{app.job.department}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Unknown</span>
                        )}
                      </td>
                      <td className="py-5 px-3 text-gray-500 text-sm">{formatDate(app.createdAt)}</td>
                      <td className="py-5 px-3">
                        {app.coverLetter ? (
                          <button
                            onClick={() => setViewApp(app)}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" /> View
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-5 px-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[app.status]}`}>
                          {STATUS_LABEL[app.status]}
                        </span>
                      </td>
                      <td className="py-5 px-3">
                        <button
                          onClick={() => setViewApp(app)}
                          title="View & Contact"
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4 text-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewApp && (
        <ViewModal
          app={viewApp}
          onClose={() => setViewApp(null)}
          onStatusChange={handleStatusChange}
          updatingId={updatingId}
        />
      )}
    </div>
  )
}
