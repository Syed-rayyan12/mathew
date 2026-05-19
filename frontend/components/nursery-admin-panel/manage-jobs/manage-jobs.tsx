'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, X, Users, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
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
  nurseryName: '',
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
          nurseryName: initial.nurseryName || '',
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
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred. Please try again.')
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

          {/* Row: location + nurseryName */}
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
                Nursery / Group Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.nurseryName}
                onChange={e => set('nurseryName', e.target.value)}
                placeholder="e.g. Sunshine Kids Nursery"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Experience */}
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
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await jobService.adminGetAllJobs()
      if (res.success && res.data) setJobs(res.data)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load jobs')
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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete job')
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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update job status')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = jobs.filter(j => {
    const searchMatch =
      !searchQuery ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase())
    const typeMatch = typeFilter === 'all' || j.type === typeFilter
    return searchMatch && typeMatch
  })

  return (
    <div className="w-full">

      {/* HEADER */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
              <span className="text-foreground">MANAGE</span> Jobs
            </h2>
            <p className="text-gray-600">Post and manage jobs that appear as cards on the Jobs page</p>
          </div>
          <button
            onClick={() => { setEditJob(null); setShowForm(true) }}
            className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition cursor-pointer w-full md:w-auto justify-center"
          >
            <Plus size={16} /> Post New Job
          </button>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="w-full bg-white p-4 rounded-lg flex flex-wrap items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10 rounded-sm"
            placeholder="Search by title, department, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] flex items-center gap-2 rounded-sm border border-secondary bg-white px-3 py-2 text-sm">
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="FULL_TIME">Full-time</SelectItem>
            <SelectItem value="PART_TIME">Part-time</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
          </SelectContent>
        </Select>

        {!loading && (
          <span className="ml-auto text-sm text-gray-400">
            {filtered.length} of {jobs.length} jobs · {jobs.reduce((s, j) => s + (j._count?.applications ?? 0), 0)} total applications
          </span>
        )}
      </div>

      {/* TABLE */}
      <div className="shadow-md p-4 bg-white rounded-lg">
        <h2 className="font-sans font-bold text-xl">All Jobs</h2>
        <p className="text-gray-500">Toggle Active/Inactive to show or hide a job on the public Jobs page.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <div className="w-full mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                  <th className="p-3 text-left" style={{ borderRadius: '4px 0px 0px 4px' }}>Job Title</th>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Experience</th>
                  <th className="p-3 text-left">Applications</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left" style={{ borderRadius: '0px 4px 4px 0px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex justify-center w-full">
                        <span className="block text-center py-10 text-gray-500">
                          {jobs.length === 0 ? 'No jobs posted yet. Click "Post New Job" to get started.' : 'No jobs match your search.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(job => (
                    <tr key={job.id} className="border-b hover:bg-gray-50">
                      <td className="py-5 px-3 font-bold">{job.title}</td>
                      <td className="py-5 px-3 text-gray-500">{job.department}</td>
                      <td className="py-5 px-3 text-gray-500">{job.location}</td>
                      <td className="py-5 px-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[job.type]}`}>
                          {JOB_TYPE_LABEL[job.type]}
                        </span>
                      </td>
                      <td className="py-5 px-3 text-gray-500">{job.experience}</td>
                      <td className="py-5 px-3">
                        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                          <Users size={13} />
                          {job._count?.applications ?? 0}
                        </span>
                      </td>
                      <td className="py-5 px-3">
                        <button
                          onClick={() => handleToggle(job)}
                          disabled={togglingId === job.id}
                          className="flex items-center gap-1.5"
                        >
                          {togglingId === job.id ? (
                            <Loader2 size={14} className="animate-spin text-gray-400" />
                          ) : job.isActive ? (
                            <>
                              <ToggleRight size={20} className="text-green-500" />
                              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700`}>Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={20} className="text-gray-400" />
                              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500`}>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-5 px-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setEditJob(job); setShowForm(true) }}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-foreground" />
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            disabled={deletingId === job.id}
                            title="Delete"
                          >
                            {deletingId === job.id
                              ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              : <Trash2 className="w-4 h-4 text-red-500" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
