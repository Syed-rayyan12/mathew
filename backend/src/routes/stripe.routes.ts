import { Router } from 'express';
import { createCheckoutSession, verifySession } from '../controllers/stripe.controller';

const router = Router();

// Create checkout session (public – called from signup form)
router.post('/create-checkout-session', createCheckoutSession);

// Verify Stripe session and create user account after payment
router.post('/verify-session', verifySession);

// NOTE: The webhook route is mounted directly in server.ts
// with express.raw() body parser, not here with express.json()

export default router;
