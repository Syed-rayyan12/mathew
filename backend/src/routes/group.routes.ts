import { Router } from 'express';
import {
  getMyGroup,
  updateNurseryGroup,
} from '../controllers/nursery-dashboard.controller';
import { authenticate } from '../middleware';

const router = Router();

// Protected routes (require authentication)
router.get('/my/group', authenticate, getMyGroup);
router.put('/update', authenticate, updateNurseryGroup);

export default router;
