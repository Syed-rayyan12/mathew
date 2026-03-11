import { Router } from 'express';
import {
  getAllNotifications,
  getRecentNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationStats,
  submitSupportRequest,
  getNurseryNotifications,
  markNurseryNotificationAsRead,
  getUserNotifications,
  markUserNotificationAsRead,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware';

const router = Router();

// User (parent) specific routes
router.get('/user', authenticate, getUserNotifications);
router.put('/user/:id/read', authenticate, markUserNotificationAsRead);

// Nursery-specific routes (must be before /:id routes)
router.get('/nursery', authenticate, getNurseryNotifications);
router.put('/nursery/:id/read', authenticate, markNurseryNotificationAsRead);

// Specific routes first (before parameter routes)
router.get('/recent', authenticate, getRecentNotifications);
router.get('/stats', authenticate, getNotificationStats);
router.put('/read-all', authenticate, markAllAsRead);
router.post('/support', authenticate, submitSupportRequest);

// Then parameter-based routes
router.put('/:id/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);

// General routes
router.get('/', authenticate, getAllNotifications);
router.delete('/', authenticate, clearAllNotifications);

export default router;
