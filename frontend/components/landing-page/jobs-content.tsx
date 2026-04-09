'use client'

import { useState } from 'react'
import { X, MapPin, Clock, Briefcase, ChevronRight, CheckCircle } from 'lucide-react'

interface Job {
  id: number
  title: string
  department: string
  location: string
  type: 'Full-time' | 'Part-time' | 'Contract'
  experience: string
  description: string
  responsibilities: string[]
  requirements: string[]
  postedDate: string
}

const jobs: Job[] = [
  {
    id: 1,
    title: 'Nursery Manager',
    department: 'Operations',
    location: 'London, UK',
    type: 'Full-time',
    experience: '3+ years',
    description:
      'We are looking for an experienced Nursery Manager to lead day-to-day operations, ensure outstanding childcare standards, and manage a dedicated team of professionals.',
    responsibilities: [
      'Oversee daily operations and staff management',
      'Ensure compliance with Ofsted and safeguarding regulations',
      'Build strong relationships with parents and guardians',
      'Manage budgets and resources effectively',
      'Lead continuous improvement initiatives',
    ],
    requirements: [
      'Level 5 Early Years qualification or equivalent',
      'Minimum 3 years nursery management experience',
      'Strong knowledge of EYFS framework',
      'Excellent communication and leadership skills',
      'Enhanced DBS check required',
    ],
    postedDate: '2 days ago',
  },
  {
    id: 2,
    title: 'Early Years Practitioner',
    department: 'Childcare',
    location: 'Manchester, UK',
    type: 'Full-time',
    experience: '1+ years',
    description:
      'Join our passionate childcare team as an Early Years Practitioner where you will support children aged 0–5 in their learning and development journey.',
    responsibilities: [
      'Plan and deliver age-appropriate activities',
      "Observe and record children's progress",
      'Maintain a safe and stimulating environment',
      'Communicate effectively with parents and colleagues',
      "Support key children's individual development plans",
    ],
    requirements: [
      'Level 3 Early Years qualification',
      'Experience working in an early years setting',
      'Passion for child development and education',
      'Team player with strong interpersonal skills',
      'Enhanced DBS check required',
    ],
    postedDate: '5 days ago',
  },
  {
    id: 3,
    title: 'Room Leader – Toddlers',
    department: 'Childcare',
    location: 'Birmingham, UK',
    type: 'Full-time',
    experience: '2+ years',
    description:
      'We are seeking a motivated Room Leader for our Toddler room. You will take the lead in planning, delivering, and evaluating activities for children aged 1–3.',
    responsibilities: [
      'Lead the toddler room and mentor junior staff',
      'Plan and deliver the weekly curriculum',
      'Conduct parent updates and progress reviews',
      'Ensure the room meets health and safety standards',
      "Monitor and assess children's development milestones",
    ],
    requirements: [
      'Level 3 Early Years qualification (minimum)',
      '2 years experience in a lead role',
      'Strong knowledge of EYFS and development milestones',
      'Confident communicator with parents and team',
      'Enhanced DBS check required',
    ],
    postedDate: '1 week ago',
  },
  {
    id: 4,
    title: 'Nursery Cook',
    department: 'Catering',
    location: 'Leeds, UK',
    type: 'Part-time',
    experience: '1+ years',
    description:
      'We are looking for a passionate Nursery Cook to prepare healthy, nutritious meals for children aged 3 months to 5 years in line with dietary requirements and food standards.',
    responsibilities: [
      'Prepare and cook fresh daily meals for all children',
      'Accommodate allergies and dietary requirements',
      'Maintain kitchen hygiene to the highest standards',
      'Plan menus in collaboration with the management team',
      'Monitor and manage food stock and ordering',
    ],
    requirements: [
      'Level 2 Food Hygiene certificate (minimum)',
      'Experience cooking for young children',
      'Knowledge of nutritional needs of early years children',
      'Organised and able to work independently',
      'Enhanced DBS check required',
    ],
    postedDate: '3 days ago',
  },
  {
    id: 5,
    title: 'SENCO (Special Educational Needs Coordinator)',
    department: 'Inclusion & SEND',
    location: 'Bristol, UK',
    type: 'Full-time',
    experience: '3+ years',
    description:
      'We are recruiting a SENCO to champion inclusive practice and ensure all children with additional needs receive the best possible support.',
    responsibilities: [
      'Lead SEND provision across the nursery',
      'Liaise with external agencies and support services',
      'Create and review individual education plans (IEPs)',
      'Support and train staff on inclusive practice',
      'Work closely with families of children with SEND',
    ],
    requirements: [
      'Early Years degree or equivalent Level 6 qualification',
      'SENCO qualification or willingness to complete',
      '3 years experience in an early years SEND role',
      'Knowledge of current SEND legislation and EYFS',
      'Enhanced DBS check required',
    ],
    postedDate: '1 week ago',
  },
  {
    id: 6,
    title: 'Nursery Administrator',
    department: 'Administration',
    location: 'Remote / London, UK',
    type: 'Part-time',
    experience: '1+ years',
    description:
      'We are looking for an organised and friendly Nursery Administrator to manage front-office operations, communications, and administrative tasks.',
    responsibilities: [
      'Handle enquiries via phone, email, and in person',
      'Maintain accurate records and filing systems',
      'Manage bookings, enrolments, and waiting lists',
      'Assist with invoicing and fee collection',
      'Support the management team with ad-hoc tasks',
    ],
    requirements: [
      'Proven experience in an administrative role',
      'Proficient in Microsoft Office and nursery management software',
      'Excellent organisational and communication skills',
      'Knowledge of GDPR and data handling standards',
      'Enhanced DBS check required',
    ],
    postedDate: '4 days ago',
  },
]

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
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
  'Full-time': 'bg-green-100 text-green-700',
  'Part-time': 'bg-blue-100 text-blue-700',
  'Contract': 'bg-orange-100 text-orange-700',
}

export default function JobsContent() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [applyJob, setApplyJob] = useState<Job | null>(null)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Banner */}
      <section className="bg-primary text-white py-16 px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-white/70 mb-2">We're Hiring</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Current Openings</h1>
        <p className="text-white/80 max-w-xl mx-auto text-base">
          Join our growing team and help shape the future of early years childcare across the UK.
        </p>
      </section>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-6 items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{jobs.length} positions</span> currently open
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Full-time</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Part-time</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Contract</span>
          </div>
        </div>
      </div>

      {/* Job Listings */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-4">
          {jobs.map(job => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-md transition-shadow"
            >
              {/* Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeBadgeColor[job.type]}`}>
                    {job.type}
                  </span>
                  <span className="text-xs text-gray-400">{job.postedDate}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h2>
                <p className="text-sm text-primary font-medium">{job.department}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><MapPin size={14} />{job.location}</span>
                  <span className="flex items-center gap-1"><Clock size={14} />{job.experience}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="text-sm px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary hover:text-primary transition font-medium"
                >
                  View Details
                </button>
                <button
                  onClick={() => setApplyJob(job)}
                  className="text-sm px-5 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-1"
                >
                  Apply <ChevronRight size={15} />
                </button>
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
            <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 z-10">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider">{selectedJob.department}</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedJob.title}</h2>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={14} />{selectedJob.location}</span>
                <span className="flex items-center gap-1"><Clock size={14} />{selectedJob.experience}</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeBadgeColor[selectedJob.type]}`}>
                  {selectedJob.type}
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
