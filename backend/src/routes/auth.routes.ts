import { Router } from 'express';
import { signup, signin, updateProfile, changePassword, nurserySignup, nurserySignin, logout, deleteAccount } from '../controllers/auth.controller';
import { authenticate } from '../middleware';

const router = Router();

// Public routes
router.post('/user-signup', signup);
router.post('/user-signin', signin);

// Nursery owner routes
router.post('/nursery-signup', nurserySignup);
router.post('/nursery-signin', nurserySignin);

// Protected routes
router.post('/logout', authenticate, logout);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);

export default router;
