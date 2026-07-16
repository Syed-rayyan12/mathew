'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, X, Users, Search, Lock, Building2, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { jobService, Job, JOB_TYPE_LABEL } from '@/lib/api/jobs'
import { nurseryGroupService } from '@/lib/api/nursery-group'
import { uploadService } from '@/lib/api/upload'
import { useNurseryPlan } from '@/hooks/use-nursery-plan'
import { toast } from 'sonner'
import Link from 'next/link'

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
  groupName?: string
  groupLocation?: string
}

function JobFormModal({ initial, onClose, onSaved, groupName, groupLocation }: JobFormModalProps) {
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
      : { ...EMPTY_FORM, location: groupLocation || '' }
  )
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // If groupLocation loads after mount (async), pre-fill once for new jobs
  useEffect(() => {
    if (!isEdit && groupLocation && !form.location) {
      setForm(prev => ({ ...prev, location: groupLocation }))
    }
  }, [groupLocation])

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const url = await uploadService.uploadImage(file)
      set('image', url)
      toast.success('Job image uploaded')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      input.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        responsibilities: form.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
        image: form.image.trim() || null,
      }

      const res = isEdit
        ? await jobService.nurseryUpdateJob(initial!.id, payload)
        : await jobService.nurseryCreateJob(payload)

      if (res.success) {
        toast.success(isEdit ? 'Job updated' : 'Job posted successfully')
        onSaved()
        onClose()
      } else {
        toast.error(res.message || 'Failed to save job')
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Job' : 'Post a New Job'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {/* Nursery info banner */}
          {groupName && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700">
              <Building2 size={15} className="shrink-0" />
              <span>Posting on behalf of <strong>{groupName}</strong></span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Job Title <span className="text-red-500">*</span></label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Nursery Practitioner" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Department <span className="text-red-500">*</span></label>
              <Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Early Years" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Location <span className="text-red-500">*</span></label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. London, UK" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Job Type</label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Experience Required <span className="text-red-500">*</span></label>
            <Input value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="e.g. 1-2 years" required />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description <span className="text-red-500">*</span></label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              required
              placeholder="Describe the role..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Responsibilities <span className="text-xs text-gray-400">(one per line)</span></label>
            <textarea
              value={form.responsibilities}
              onChange={e => set('responsibilities', e.target.value)}
              rows={3}
              placeholder="Plan and deliver activities&#10;Support children's development"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Requirements <span className="text-xs text-gray-400">(one per line)</span></label>
            <textarea
              value={form.requirements}
              onChange={e => set('requirements', e.target.value)}
              rows={3}
              placeholder="Level 3 qualification&#10;Enhanced DBS check"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Job Image <span className="text-xs text-gray-400">(optional)</span></label>
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-3">
              {form.image ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-[16/7]">
                    <img src={form.image} alt="Job image preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => set('image', '')}
                      disabled={uploadingImage}
                      aria-label="Remove job image"
                      title="Remove image"
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 ${uploadingImage ? 'pointer-events-none opacity-50' : ''}`}>
                    {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingImage ? 'Uploading...' : 'Replace image'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md text-center hover:bg-gray-50 ${uploadingImage ? 'pointer-events-none opacity-50' : ''}`}>
                  {uploadingImage ? <Loader2 size={28} className="mb-2 animate-spin text-gray-400" /> : <Upload size={28} className="mb-2 text-gray-400" />}
                  <span className="text-sm font-medium text-gray-700">{uploadingImage ? 'Uploading image...' : 'Choose an image from your computer'}</span>
                  <span className="mt-1 text-xs text-gray-400">JPEG, PNG, GIF or WebP, up to 10 MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('isActive', !form.isActive)}>
                {form.isActive
                  ? <ToggleRight size={28} className="text-green-500" />
                  : <ToggleLeft size={28} className="text-gray-400" />}
              </button>
              <span className="text-sm text-gray-600">{form.isActive ? 'Active (visible on site)' : 'Inactive (hidden from site)'}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving || uploadingImage} className="px-5 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
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

export default function NurseryJobManagement() {
  const plan = useNurseryPlan()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [groupName, setGroupName] = useState<string>('')
  const [groupLocation, setGroupLocation] = useState<string>('')

  const load = useCallback(() => {
    setLoading(true)
    jobService.nurseryGetMyJobs()
      .then(res => { if (res.success && res.data) setJobs(res.data) })
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Fetch group profile to auto-fill nursery name + location
  useEffect(() => {
    nurseryGroupService.getMyGroup('').then((res: any) => {
      if (res?.success && res?.data) {
        const g = res.data
        setGroupName(g.name || '')
        setGroupLocation(g.town || g.city || '')
      }
    }).catch(() => {})
  }, [])

  if (plan !== 'platinum') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-10 max-w-md">
          <Lock size={40} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Platinum Plan Required</h2>
          <p className="text-gray-500 text-sm mb-6">
            Job posting is available exclusively on the <strong>Platinum</strong> plan.
            Upgrade to post jobs and receive applications directly from the website.
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job? All applications will also be removed.')) return
    try {
      const res = await jobService.nurseryDeleteJob(id)
      if (res.success) { toast.success('Job deleted'); load() }
      else toast.error(res.message || 'Failed to delete')
    } catch { toast.error('Failed to delete job') }
  }

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.department.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Job Postings</h1>
          <p className="text-sm text-gray-500 mt-1">Post jobs for your nursery — they appear live on the Jobs page</p>
        </div>
        <button
          onClick={() => { setEditJob(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm"
        >
          <Plus size={16} /> Post a Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Jobs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{jobs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{jobs.filter(j => j.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Applicants</p>
          <p className="text-2xl font-bold text-primary mt-1">{jobs.reduce((s, j) => s + (j._count?.applications ?? 0), 0)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="pl-9"
        />
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">{search ? 'No matching jobs' : "You haven't posted any jobs yet"}</p>
            {!search && (
              <button
                onClick={() => { setEditJob(null); setShowForm(true) }}
                className="mt-4 text-sm text-primary underline"
              >
                Post your first job
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Job Title</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Applicants</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{job.title}</td>
                    <td className="px-5 py-3.5 text-gray-500">{job.department}</td>
                    <td className="px-5 py-3.5 text-gray-500">{job.location}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[job.type]}`}>
                        {JOB_TYPE_LABEL[job.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users size={13} /> {job._count?.applications ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditJob(job); setShowForm(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                        >
                          <Trash2 size={14} />
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

      {showForm && (
        <JobFormModal
          initial={editJob}
          onClose={() => { setShowForm(false); setEditJob(null) }}
          onSaved={load}
          groupName={groupName}
          groupLocation={groupLocation}
        />
      )}
    </div>
  )
}
