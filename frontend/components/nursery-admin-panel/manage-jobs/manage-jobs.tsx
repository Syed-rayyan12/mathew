'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, X, ChevronRight, Users } from 'lucide-react'
import { jobService, Job, JOB_TYPE_LABEL } from '@/lib/api/jobs'
import { toast } from 'sonner'

const JOB_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
]

const EMPTY_FORM = {
  title: '',
  department: '',
  location: '',
  type: 'FULL_TIME' as Job['type'],
  experience: '',
  description: '',
  responsibilities: '',
  requirements: '',
  image: '',
  isActive: true,
}

type FormState = typeof EMPTY_FORM

interface JobFormModalProps {
  initial?: Job | null
  onClose: () => void
  onSaved: () => void
}

function JobFormModal({ initial, onClose, onSaved }: JobFormModalProps) {
  const isEdit = !!initial
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          title: initial.title,
          department: initial.department,
          location: initial.location,
          type: initial.type,
          experience: initial.experience,
          description: initial.description,
          responsibilities: initial.responsibilities.join('\n'),
          requirements: initial.requirements.join('\n'),
          image: initial.image || '',
          isActive: initial.isActive,
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        responsibilities: form.responsibilities
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        requirements: form.requirements
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        image: form.image.trim() || undefined,
      }

      const res = isEdit
        ? await jobService.adminUpdateJob(initial!.id, payload)
        : await jobService.adminCreateJob(payload)

      if (res.success) {
        toast.success(isEdit ? 'Job updated successfully' : 'Job created successfully')
        onSaved()
        onClose()
      } else {
        toast.error(res.message || 'Failed to save job')
      }
    } catch {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Job' : 'Post a New Job'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {/* Row: title + department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Nursery Manager"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="e.g. Operations"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row: location + experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. London, UK"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Experience Required <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.experience}
                onChange={e => set('experience', e.target.value)}
                placeholder="e.g. 2+ years"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row: type + isActive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Job Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {JOB_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="text-sm font-medium text-gray-700">Active (visible on site)</span>
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
                </button>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief overview of the role..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Responsibilities <span className="text-xs text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              rows={4}
              value={form.responsibilities}
              onChange={e => set('responsibilities', e.target.value)}
              placeholder="Oversee daily operations&#10;Manage a team of practitioners&#10;Liaise with parents..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Requirements <span className="text-xs text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              rows={4}
              value={form.requirements}
              onChange={e => set('requirements', e.target.value)}
              placeholder="Level 5 qualification&#10;3+ years experience&#10;Enhanced DBS check..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Image URL <span className="text-xs text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={form.image}
              onChange={e => set('image', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TYPE_BADGE: Record<string, string> = {
  FULL_TIME: 'bg-green-100 text-green-700',
  PART_TIME: 'bg-blue-100 text-blue-700',
  CONTRACT: 'bg-orange-100 text-orange-700',
}

export default function ManageJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await jobService.adminGetAllJobs()
      if (res.success && res.data) setJobs(res.data)
    } catch {
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job? All applications will also be removed.')) return
    setDeletingId(id)
    try {
      const res = await jobService.adminDeleteJob(id)
      if (res.success) {
        toast.success('Job deleted')
        setJobs(prev => prev.filter(j => j.id !== id))
      } else {
        toast.error(res.message || 'Failed to delete job')
      }
    } catch {
      toast.error('Failed to delete job')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (job: Job) => {
    setTogglingId(job.id)
    try {
      const res = await jobService.adminUpdateJob(job.id, { isActive: !job.isActive })
      if (res.success) {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isActive: !j.isActive } : j))
        toast.success(`Job ${!job.isActive ? 'activated' : 'deactivated'}`)
      }
    } catch {
      toast.error('Failed to update job status')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Post jobs that appear as cards on the Jobs page</p>
        </div>
        <button
          onClick={() => { setEditJob(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 transition"
        >
          <Plus size={16} /> Post New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{jobs.filter(j => j.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Applications</p>
          <p className="text-2xl font-bold text-blue-600">
            {jobs.reduce((sum, j) => sum + (j._count?.applications ?? 0), 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium text-gray-500">No jobs posted yet</p>
            <p className="text-sm mt-1">Click "Post New Job" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Job Title</th>
                  <th className="text-left px-6 py-3">Department</th>
                  <th className="text-left px-6 py-3">Location</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-left px-6 py-3">Applications</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{job.experience}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{job.department}</td>
                    <td className="px-6 py-4 text-gray-600">{job.location}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[job.type]}`}>
                        {JOB_TYPE_LABEL[job.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                        <Users size={13} />
                        {job._count?.applications ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(job)}
                        disabled={togglingId === job.id}
                        className="flex items-center gap-1 text-xs font-medium"
                      >
                        {togglingId === job.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : job.isActive ? (
                          <>
                            <ToggleRight size={18} className="text-green-500" />
                            <span className="text-green-600">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={18} className="text-gray-400" />
                            <span className="text-gray-400">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditJob(job); setShowForm(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          disabled={deletingId === job.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                          title="Delete"
                        >
                          {deletingId === job.id
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Trash2 size={15} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job form modal */}
      {showForm && (
        <JobFormModal
          initial={editJob}
          onClose={() => { setShowForm(false); setEditJob(null) }}
          onSaved={fetchJobs}
        />
      )}
    </div>
  )
}
