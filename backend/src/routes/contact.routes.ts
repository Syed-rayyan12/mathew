import { Router } from 'express';
import {
  submitContact,
  getAllContacts,
  markContactAsRead,
  deleteContact,
} from '../controllers/contact.controller';
import { authenticate, authorize } from '../middleware';

const router = Router();

// Public route
router.post('/', submitContact);

// Protected routes (Admin only)
router.get('/', authenticate, authorize('ADMIN'), getAllContacts);
router.put('/:id/read', authenticate, authorize('ADMIN'), markContactAsRead);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteContact);

export default router;
