import { Router } from 'express';
import { getRecentlyViewed, recordView, clearRecentlyViewed } from '../controllers/recently-viewed.controller';
import { authenticate } from '../middleware';

const router = Router();

router.get('/', authenticate, getRecentlyViewed);
router.post('/:nurseryId', authenticate, recordView);
router.delete('/', authenticate, clearRecentlyViewed);

export default router;
