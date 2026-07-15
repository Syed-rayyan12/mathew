import { Router } from 'express';
import {
  adminSignin,
  getAllGroups,
  getAllNurseriesAdmin,
  getAllUsers,
  getAllNurseryOwners,
  getAllReviews,
  getAllArticles,
  getDashboardStats,
  deleteGroup,
  deleteNursery,
  deleteUser,
  toggleGroupStatus,
  toggleNurseryStatus,
  getUsersPendingApproval,
  approveUser,
  rejectUser,
  getMonthlyUserStats,
  getMonthlyReviewStats,
  updateNurseryAdmin,
  updateGroupAdmin,
} from '../controllers/admin.controller';
import { authenticate, authorize, authRateLimiter } from '../middleware';

const router = Router();

// Public route
router.post('/signin', authRateLimiter, adminSignin);

// Everything below requires a valid token with the ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/groups', getAllGroups);
router.get('/nurseries', getAllNurseriesAdmin);
router.get('/users', getAllUsers);  // Regular users only
router.get('/nursery-owners', getAllNurseryOwners);  // Nursery owners only
router.get('/reviews', getAllReviews);  // All reviews
router.get('/articles', getAllArticles);  // All articles
router.get('/stats', getDashboardStats);

// Analytics routes
router.get('/analytics/monthly-users', getMonthlyUserStats);
router.get('/analytics/monthly-reviews', getMonthlyReviewStats);

// Delete routes
router.delete('/groups/:id', deleteGroup);
router.delete('/nurseries/:id', deleteNursery);
router.delete('/users/:id', deleteUser);

// Toggle active status routes
router.patch('/groups/:id/toggle-status', toggleGroupStatus);
router.patch('/nurseries/:id/toggle-status', toggleNurseryStatus);

// Update routes
router.put('/nurseries/:id', updateNurseryAdmin);
router.put('/groups/:id', updateGroupAdmin);

// User approval routes
router.get('/approvals/pending', getUsersPendingApproval);
router.put('/approvals/:id/approve', approveUser);
router.delete('/approvals/:id/reject', rejectUser);

export default router;
