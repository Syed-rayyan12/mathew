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
} from '../controllers/notification.controller';
import { authenticate } from '../middleware';

const router = Router();

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
