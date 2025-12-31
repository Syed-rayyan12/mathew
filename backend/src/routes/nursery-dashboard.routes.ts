import { Router } from 'express';
import { 
  getMyNursery, 
  createNursery, 
  updateNursery, 
  deleteNursery, 
  getMyNurseryReviews,
  getMyGroup,
  updateNurseryGroup
} from '../controllers/nursery-dashboard.controller';
import { authenticate, authorize } from '../middleware';

const router = Router();

// Protected routes (require authentication)
router.use(authenticate);
router.use(authorize('NURSERY_OWNER', 'ADMIN'));

// Get my nursery
router.get('/my-nursery', getMyNursery);

// Get my nursery group (for settings page)
router.get('/my-group', getMyGroup);

// Get my nursery reviews with stats
router.get('/my-reviews', getMyNurseryReviews);

// Create new nursery (from nursery signup/dashboard)
router.post('/create', createNursery);

// Update nursery profile (from settings page)
router.put('/update', updateNursery);

// Update nursery group (from settings page)
router.put('/update-group', updateNurseryGroup);

// Delete nursery
router.delete('/:id', deleteNursery);

export default router;
