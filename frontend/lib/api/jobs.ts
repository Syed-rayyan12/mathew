import { apiClient, adminApiClient, nurseryApiClient, ApiResponse } from './client';

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  experience: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  image?: string | null;
  isActive: boolean;
  nurseryName?: string | null;
  postedById?: string | null;
  createdAt: string;
  _count?: { applications: number };
}

export interface JobApplication {
  id: string;
  jobId: string;
  fullName: string;
  email: string;
  phone?: string;
  coverLetter?: string;
  cvUrl?: string;
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED';
  createdAt: string;
  job?: { id: string; title: string; department: string; location: string };
}

export const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
};

export const jobService = {
  // Public: get all active jobs
  getJobs: (): Promise<ApiResponse<Job[]>> =>
    apiClient.get<Job[]>('/jobs'),

  // Public: submit a job application
  applyForJob: (
    jobId: string,
    data: { fullName: string; email: string; phone?: string; coverLetter?: string; cvUrl?: string }
  ): Promise<ApiResponse<JobApplication>> =>
    apiClient.post<JobApplication>(`/jobs/${jobId}/apply`, data),

  // Admin: get all jobs (including inactive)
  adminGetAllJobs: (): Promise<ApiResponse<Job[]>> =>
    adminApiClient.get<Job[]>('/jobs/admin/all', true),

  // Admin: create job
  adminCreateJob: (data: Partial<Job>): Promise<ApiResponse<Job>> =>
    adminApiClient.post<Job>('/jobs/admin', data, true),

  // Admin: update job
  adminUpdateJob: (id: string, data: Partial<Job>): Promise<ApiResponse<Job>> =>
    adminApiClient.put<Job>(`/jobs/admin/${id}`, data, true),

  // Admin: delete job
  adminDeleteJob: (id: string): Promise<ApiResponse<void>> =>
    adminApiClient.delete<void>(`/jobs/admin/${id}`, true),

  // Admin: get all applications (optionally filter by jobId or status)
  adminGetApplications: (params?: { jobId?: string; status?: string }): Promise<ApiResponse<JobApplication[]>> => {
    let endpoint = '/jobs/admin/applications';
    if (params) {
      const q = new URLSearchParams();
      if (params.jobId) q.append('jobId', params.jobId);
      if (params.status) q.append('status', params.status);
      if (q.toString()) endpoint += `?${q.toString()}`;
    }
    return adminApiClient.get<JobApplication[]>(endpoint, true);
  },

  // Admin: update application status
  adminUpdateApplicationStatus: (
    id: string,
    status: string
  ): Promise<ApiResponse<JobApplication>> =>
    adminApiClient.put<JobApplication>(`/jobs/admin/applications/${id}/status`, { status }, true),

  // ── Nursery owner methods ──────────────────────────────────────────────────

  // Nursery: get my jobs
  nurseryGetMyJobs: (): Promise<ApiResponse<Job[]>> =>
    nurseryApiClient.get<Job[]>('/jobs/nursery/my-jobs', true),

  // Nursery: create a job
  nurseryCreateJob: (data: Partial<Job>): Promise<ApiResponse<Job>> =>
    nurseryApiClient.post<Job>('/jobs/nursery', data, true),

  // Nursery: update a job
  nurseryUpdateJob: (id: string, data: Partial<Job>): Promise<ApiResponse<Job>> =>
    nurseryApiClient.put<Job>(`/jobs/nursery/${id}`, data, true),

  // Nursery: delete a job
  nurseryDeleteJob: (id: string): Promise<ApiResponse<void>> =>
    nurseryApiClient.delete<void>(`/jobs/nursery/${id}`, true),

  // Nursery: get applicants for my jobs
  nurseryGetApplications: (params?: { jobId?: string; status?: string }): Promise<ApiResponse<JobApplication[]>> => {
    let endpoint = '/jobs/nursery/applications';
    if (params) {
      const q = new URLSearchParams();
      if (params.jobId) q.append('jobId', params.jobId);
      if (params.status) q.append('status', params.status);
      if (q.toString()) endpoint += `?${q.toString()}`;
    }
    return nurseryApiClient.get<JobApplication[]>(endpoint, true);
  },

  // Nursery: update application status
  nurseryUpdateApplicationStatus: (
    id: string,
    status: string
  ): Promise<ApiResponse<JobApplication>> =>
    nurseryApiClient.put<JobApplication>(`/jobs/nursery/applications/${id}/status`, { status }, true),
};
