import { apiClient, nurseryApiClient } from './client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Validate a file before uploading
const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File "${file.name}" has an unsupported type (${file.type}). Allowed: JPEG, PNG, GIF, WebP, MP4.`;
  }
  return null;
};

export const uploadService = {
  // Upload a single image and return the R2 URL
  uploadImage: async (file: File): Promise<string> => {
    const error = validateFile(file);
    if (error) throw new Error(error);

    const response = await apiClient.uploadFile<{ url: string }>('/upload', file);
    if (!response.success || !response.data?.url) {
      throw new Error(response.message || 'Upload failed');
    }
    return response.data.url;
  },

  // Upload multiple images and return R2 URLs
  uploadImages: async (files: File[]): Promise<string[]> => {
    for (const file of files) {
      const error = validateFile(file);
      if (error) throw new Error(error);
    }

    const response = await apiClient.uploadFiles<{ urls: string[] }>('/upload/multiple', files);
    if (!response.success || !response.data?.urls) {
      throw new Error(response.message || 'Upload failed');
    }
    return response.data.urls;
  },

  // Upload a single video and return the R2 URL
  uploadVideo: async (file: File): Promise<string> => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error('Only MP4 videos are allowed.');
    }
    const error = validateFile(file);
    if (error) throw new Error(error);

    const response = await apiClient.uploadFile<{ url: string }>('/upload', file);
    if (!response.success || !response.data?.url) {
      throw new Error(response.message || 'Upload failed');
    }
    return response.data.url;
  },
};
