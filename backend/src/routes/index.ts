import { Router } from 'express';
import authRoutes from './auth.routes';
import userNurseryRoutes from './user.nursery.routes';
import nurseryDashboardRoutes from './nursery-dashboard.routes';
import reviewRoutes from './review.routes';
import articleRoutes from './article.routes';
import contactRoutes from './contact.routes';
import adminRoutes from './admin.routes';
import groupRoutes from './group.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user/nurseries', userNurseryRoutes);  // Public nursery listings
router.use('/nursery-dashboard', nurseryDashboardRoutes);  // Nursery owner dashboard
router.use('/reviews', reviewRoutes);
router.use('/articles', articleRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);  // Admin routes
router.use('/groups', groupRoutes);  // Group routes
router.use('/notifications', notificationRoutes);  // Notification routes

export default router;
