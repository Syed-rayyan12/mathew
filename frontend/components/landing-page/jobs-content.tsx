'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { X, MapPin, Clock, Briefcase, ChevronRight, CheckCircle, Search } from 'lucide-react'
import { jobService, Job, JOB_TYPE_LABEL } from '@/lib/api/jobs'
import { toast } from 'sonner'

const DEFAULT_JOB_IMAGE = 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=600&h=300&fit=crop'

function formatPostedDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

interface ApplyModalProps {
  job: Job
  onClose: () => void
}

function ApplyModal({ job, onClose }: ApplyModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    cvFileName: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setForm(prev => ({ ...prev, cvFileName: file.name }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await jobService.applyForJob(job.id, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        coverLetter: form.coverLetter || undefined,
      })
      if (res.success) {
        setSubmitted(true)
      } else {
        toast.error(res.message || 'Failed to submit application')
      }
    } catch {
      toast.error('Failed to submit application. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 z-10">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Apply Now</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <CheckCircle size={56} className="text-green-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Application Sent!</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                Thank you, <strong>{form.fullName}</strong>! Your application for{' '}
                <strong>{job.title}</strong> has been received. We'll be in touch soon.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+44 7700 000000"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Upload CV <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:border-primary transition">
                  <Briefcase size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {form.cvFileName || 'Click to upload CV (PDF, DOC)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    required
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cover Letter
                </label>
                <textarea
                  name="coverLetter"
                  value={form.coverLetter}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us why you'd be a great fit for this role..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition text-sm"
              >
                Submit Application
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const typeBadgeColor: Record<string, string> = {
  FULL_TIME: 'bg-green-100 text-green-700',
  PART_TIME: 'bg-blue-100 text-blue-700',
  CONTRACT: 'bg-orange-100 text-orange-700',
}

export default function JobsContent() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [applyJob, setApplyJob] = useState<Job | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [localSearch, setLocalSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const searchParams = useSearchParams()
  const urlSearch = searchParams.get('search') || ''

  useEffect(() => {
    setLocalSearch(urlSearch)
    setAppliedSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    jobService.getJobs()
      .then(res => { if (res.success && res.data) setJobs(res.data) })
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [])

  const filteredJobs = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter(job =>
      job.title.toLowerCase().includes(q) ||
      (job.department && job.department.toLowerCase().includes(q)) ||
      (job.description && job.description.toLowerCase().includes(q)) ||
      job.location.toLowerCase().includes(q)
    )
  }, [jobs, appliedSearch])

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Banner */}
      <section className="bg-primary text-white pt-16 pb-0 px-6 text-center relative">
        <p className="text-sm font-medium uppercase tracking-widest text-white/70 mb-2">We're Hiring</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-2 flex items-center justify-center gap-6">
          <Briefcase size={36} className="text-white/80" />
          <span className="border-b border-white pb-3 pt-3">Current Openings</span>
          <Briefcase size={36} className="text-white/80" />
        </h1>
        <p className="text-white/80 max-w-xl mx-auto text-base mb-10">
          Join our growing team and help shape the future of early years childcare across the UK.
        </p>
        {/* Search — sits at bottom edge of banner, half overlapping */}
        <div className="relative max-w-xl mx-auto translate-y-1/2">
          <div className="flex items-center bg-white rounded-lg gap-2 overflow-hidden shadow-lg p-4 border border-gray-200">
            <div className="relative flex-1 flex items-center border border-gray-100 rounded-lg">
              <Search size={16} className="absolute left-3 text-gray-400 shrink-0  pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setAppliedSearch(localSearch)}
                placeholder="Search job listings..."
                className="w-full pl-9 pr-3 py-3 rounded-lg text-gray-700 text-sm outline-none bg-transparent placeholder-gray-400"
              />
            </div>
            {localSearch && (
              <button onClick={() => { setLocalSearch(''); setAppliedSearch(''); }} className="text-gray-400 hover:text-gray-600 mr-2">
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setAppliedSearch(localSearch)}
              className="px-6 py-3.5 text-white font-semibold text-sm rounded-lg"
              style={{ backgroundColor: '#04b0d6' }}
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-6 items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Loading positions...' : (
              <>
                <span className="font-semibold text-gray-900 dark:text-white">{filteredJobs.length}</span> {localSearch ? 'results found' : 'positions currently open'}
              </>
            )}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Full-time</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Part-time</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Contract</span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Listings */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200 dark:bg-gray-700" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filteredJobs.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{localSearch ? `No jobs found for "${localSearch}"` : 'No open positions at the moment'}</p>
            <p className="text-sm mt-1">{localSearch ? 'Try a different search term.' : 'Check back soon for new opportunities.'}</p>
            {localSearch && (
              <button onClick={() => setLocalSearch('')} className="mt-4 text-sm text-primary underline">Clear search</button>
            )}
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => (
            <div
              key={job.id}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
            >
              {/* Card Image Banner */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={job.image || DEFAULT_JOB_IMAGE}
                  alt={job.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* dark overlay */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Type badge */}
                <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeBadgeColor[job.type]}`}>
                  {JOB_TYPE_LABEL[job.type]}
                </span>
                <span className="absolute top-3 left-3 text-xs text-white bg-black/40 px-2 py-0.5 rounded-full">
                  {formatPostedDate(job.createdAt)}
                </span>
                {/* Title overlay at bottom of image */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{job.department}</p>
                  <h2 className="text-base font-bold text-white leading-snug">{job.title}</h2>
                  {job.nurseryName && (
                    <p className="text-xs text-white/60 mt-0.5">📍 {job.nurseryName}</p>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">{job.description}</p>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                  {job.experience && <span className="flex items-center gap-1"><Clock size={12} />{job.experience}</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="flex-1 text-sm py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary hover:text-primary transition font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setApplyJob(job)}
                    className="flex-1 text-sm py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-1"
                  >
                    Apply <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="relative h-40 overflow-hidden">
                <img src={selectedJob.image || DEFAULT_JOB_IMAGE} alt={selectedJob.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40" />
                <button
                  onClick={() => setSelectedJob(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition"
                >
                  <X size={18} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-5 py-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{selectedJob.department}</p>
                  <h2 className="text-xl font-bold text-white">{selectedJob.title}</h2>
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-3 border-b dark:border-gray-800">
            </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={14} />{selectedJob.location}</span>
                {selectedJob.experience && <span className="flex items-center gap-1"><Clock size={14} />{selectedJob.experience}</span>}
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeBadgeColor[selectedJob.type]}`}>
                  {JOB_TYPE_LABEL[selectedJob.type]}
                </span>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About the Role</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedJob.description}</p>
              </div>

              {/* Responsibilities */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Key Responsibilities</h3>
                <ul className="space-y-1.5">
                  {selectedJob.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Requirements</h3>
                <ul className="space-y-1.5">
                  {selectedJob.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <ChevronRight size={15} className="text-primary mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => { setSelectedJob(null); setApplyJob(selectedJob) }}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition"
              >
                Apply for this Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyJob && <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} />}
    </main>
  )
}
