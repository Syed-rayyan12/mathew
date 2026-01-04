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
  getUsersPendingApproval,
  approveUser,
  rejectUser,
  getMonthlyUserStats,
  getMonthlyReviewStats,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware';

const router = Router();

// Public route
router.post('/signin', adminSignin);

// Protected admin routes
router.get('/groups', authenticate, getAllGroups);
router.get('/nurseries', authenticate, getAllNurseriesAdmin);
router.get('/users', authenticate, getAllUsers);  // Regular users only
router.get('/nursery-owners', authenticate, getAllNurseryOwners);  // Nursery owners only
router.get('/reviews', authenticate, getAllReviews);  // All reviews
router.get('/articles', authenticate, getAllArticles);  // All articles
router.get('/stats', authenticate, getDashboardStats);

// Analytics routes
router.get('/analytics/monthly-users', authenticate, getMonthlyUserStats);
router.get('/analytics/monthly-reviews', authenticate, getMonthlyReviewStats);

// Delete routes
router.delete('/groups/:id', authenticate, deleteGroup);
router.delete('/nurseries/:id', authenticate, deleteNursery);
router.delete('/users/:id', authenticate, deleteUser);

// User approval routes
router.get('/approvals/pending', authenticate, getUsersPendingApproval);
router.put('/approvals/:id/approve', authenticate, approveUser);
router.delete('/approvals/:id/reject', authenticate, rejectUser);

export default router;
