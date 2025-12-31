import { Router } from 'express';
import {
  submitReview,
  getNurseryReviews,
  getUserReviews,
  approveReview,
  unapproveReview,
  rejectReview,
  unrejectReview,
  deleteReview,
} from '../controllers/review.controller';
import { authenticate, authorize, optionalAuthenticate } from '../middleware';

const router = Router();

// Public routes (with optional authentication)
router.post('/submit', optionalAuthenticate, submitReview); // Optional auth - saves userId if logged in
router.get('/nursery/:nurseryId', getNurseryReviews);

// Protected routes
router.get('/my-reviews', authenticate, getUserReviews);
router.put('/:id/approve', authenticate, authorize('ADMIN', 'NURSERY_OWNER'), approveReview);
router.put('/:id/unapprove', authenticate, authorize('ADMIN', 'NURSERY_OWNER'), unapproveReview);
router.put('/:id/reject', authenticate, authorize('ADMIN', 'NURSERY_OWNER'), rejectReview);
router.put('/:id/unreject', authenticate, authorize('ADMIN'), unrejectReview);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteReview);

export default router;
