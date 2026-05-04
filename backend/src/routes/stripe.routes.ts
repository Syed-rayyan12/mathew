import { Router } from 'express';
import { createCheckoutSession, verifySession, createUpgradeSession, verifyUpgradeSession } from '../controllers/stripe.controller';
import { authenticate } from '../middleware';

const router = Router();

// Create checkout session (public – called from signup form)
router.post('/create-checkout-session', createCheckoutSession);

// Verify Stripe session and create user account after payment
router.post('/verify-session', verifySession);

// Upgrade existing nursery owner plan (authenticated)
router.post('/create-upgrade-session', authenticate, createUpgradeSession);
router.post('/verify-upgrade-session', verifyUpgradeSession);

// NOTE: The webhook route is mounted directly in server.ts
// with express.raw() body parser, not here with express.json()

export default router;
