import { Router } from 'express';
import { getMyShortlist, addToShortlist, removeFromShortlist, checkShortlisted } from '../controllers/shortlist.controller';
import { authenticate } from '../middleware';

const router = Router();

// All shortlist routes require authentication
router.get('/', authenticate, getMyShortlist);
router.get('/check/:nurseryId', authenticate, checkShortlisted);
router.post('/:nurseryId', authenticate, addToShortlist);
router.delete('/:nurseryId', authenticate, removeFromShortlist);

export default router;
