import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import { uploadSingleFile, uploadMultipleFiles } from '../controllers/upload.controller';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// Wrap multer to catch its errors (file too large, wrong type, etc.)
const handleMulterError = (
  uploadFn: ReturnType<typeof Object>,
  handler: (req: Request, res: Response, next: NextFunction) => void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    (uploadFn as any)(req, res, (err: any) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large. Maximum size is 10 MB.'
            : err.message || 'Upload error';
        return res.status(400).json({ success: false, message });
      }
      handler(req, res, next);
    });
  };
};

// POST /api/upload — single file
router.post('/', handleMulterError(uploadSingle, uploadSingleFile));

// POST /api/upload/multiple — up to 10 files
router.post('/multiple', handleMulterError(uploadMultiple, uploadMultipleFiles));

export default router;
