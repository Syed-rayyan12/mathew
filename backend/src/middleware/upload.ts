import multer from 'multer';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20 MB for images
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB for videos

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi', 'video/mov'];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, WebM, AVI`));
  }
};

// Single file — higher limit to cover videos
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter,
}).single('file');

// Multiple files — image-only, lower limit
export const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter,
}).array('files', 10);
