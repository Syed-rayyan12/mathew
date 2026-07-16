import { adminApiClient, nurseryApiClient } from './client';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/avi',
  'video/mov',
];

const validateImage = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `File "${file.name}" is not a supported image. Use JPEG, PNG, GIF or WebP.`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum image size is 10 MB.`;
  }
  return null;
};

const validateVideo = (file: File): string | null => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `File "${file.name}" is not a supported video. Use MP4, MOV, WebM or AVI.`;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum video size is 500 MB.`;
  }
  return null;
};

const createUploadService = (client: typeof nurseryApiClient) => ({
  uploadImage: async (file: File): Promise<string> => {
    const error = validateImage(file);
    if (error) throw new Error(error);

    const response = await client.uploadFile<{ url: string }>('/upload', file);
    if (!response.success || !response.data?.url) {
      throw new Error(response.message || 'Upload failed');
    }
    return response.data.url;
  },

  uploadImages: async (files: File[]): Promise<string[]> => {
    for (const file of files) {
      const error = validateImage(file);
      if (error) throw new Error(error);
    }

    const response = await client.uploadFiles<{ urls: string[] }>('/upload/multiple', files);
    if (!response.success || !response.data?.urls) {
      throw new Error(response.message || 'Upload failed');
    }
    return response.data.urls;
  },

  uploadVideo: async (file: File): Promise<string> => {
    const error = validateVideo(file);
    if (error) throw new Error(error);

    const response = await client.uploadFile<{ url: string }>('/upload', file);
    if (!response.success || !response.data?.url) {
      throw new Error(response.message || 'Upload failed');
    }
    return response.data.url;
  },
});

export const uploadService = createUploadService(nurseryApiClient);
export const adminUploadService = createUploadService(adminApiClient);
