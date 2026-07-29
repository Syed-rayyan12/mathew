import { apiClient, ApiResponse } from './client';
import { ENDPOINTS } from './config';

export interface ContactSubmissionInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const contactService = {
  submit: (
    data: ContactSubmissionInput
  ): Promise<ApiResponse<ContactSubmission>> =>
    apiClient.post<ContactSubmission>(ENDPOINTS.CONTACT.SUBMIT, data),
};
