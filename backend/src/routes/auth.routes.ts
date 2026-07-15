import { Router } from 'express';
import { signup, signin, updateProfile, changePassword, nurserySignup, nurserySignin, refresh, logout, deleteAccount } from '../controllers/auth.controller';
import { authenticate, authRateLimiter, refreshRateLimiter } from '../middleware';

const router = Router();

// Public routes
router.post('/user-signup', authRateLimiter, signup);
router.post('/user-signin', authRateLimiter, signin);

// Nursery owner routes
router.post('/nursery-signup', authRateLimiter, nurserySignup);
router.post('/nursery-signin', authRateLimiter, nurserySignin);

// Token refresh
router.post('/refresh', refreshRateLimiter, refresh);

// Protected routes
router.post('/logout', authenticate, logout);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);

export default router;
