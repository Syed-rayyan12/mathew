import { apiClient, adminApiClient, ApiResponse } from './client';

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
  image?: string;
  isActive: boolean;
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
};
