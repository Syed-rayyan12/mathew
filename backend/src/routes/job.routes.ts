import { Router } from 'express';
import { getJobs, applyForJob } from '../controllers/job.controller';
import {
  createJob,
  updateJob,
  deleteJob,
  getAllJobsAdmin,
  getApplications,
  updateApplicationStatus,
} from '../controllers/admin.job.controller';
import {
  nurseryGetMyJobs,
  nurseryCreateJob,
  nurseryUpdateJob,
  nurseryDeleteJob,
  nurseryGetMyApplications,
  nurseryUpdateApplicationStatus,
} from '../controllers/nursery.job.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', getJobs);
router.post('/:jobId/apply', applyForJob);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, authorize('ADMIN'), getAllJobsAdmin);
router.post('/admin', authenticate, authorize('ADMIN'), createJob);
router.put('/admin/:id', authenticate, authorize('ADMIN'), updateJob);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), deleteJob);

router.get('/admin/applications', authenticate, authorize('ADMIN'), getApplications);
router.put('/admin/applications/:id/status', authenticate, authorize('ADMIN'), updateApplicationStatus);

// ── Nursery owner routes ──────────────────────────────────────────────────────
router.get('/nursery/my-jobs', authenticate, authorize('NURSERY_OWNER'), nurseryGetMyJobs);
router.post('/nursery', authenticate, authorize('NURSERY_OWNER'), nurseryCreateJob);
router.put('/nursery/:id', authenticate, authorize('NURSERY_OWNER'), nurseryUpdateJob);
router.delete('/nursery/:id', authenticate, authorize('NURSERY_OWNER'), nurseryDeleteJob);

router.get('/nursery/applications', authenticate, authorize('NURSERY_OWNER'), nurseryGetMyApplications);
router.put('/nursery/applications/:id/status', authenticate, authorize('NURSERY_OWNER'), nurseryUpdateApplicationStatus);

export default router;
