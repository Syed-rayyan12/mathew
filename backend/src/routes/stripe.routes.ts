import { Router } from 'express';
import {
  applyChange,
  createCheckoutSession,
  createUpgradeSession,
  previewChange,
  verifySession,
  verifyUpgradeSession,
  jobsAddonCheckout,
  jobsAddonVerifySession,
  jobsAddonCancel,
} from '../controllers/stripe.controller';
import { authenticate } from '../middleware';

const router = Router();

// Signup (public – called from the signup form)
router.post('/create-checkout-session', createCheckoutSession);
router.post('/verify-session', verifySession);

// Changing an existing plan, in place, with no Stripe redirect
router.post('/preview-change', authenticate, previewChange);
router.post('/apply-change', authenticate, applyChange);

// Reactivation for an account with no live subscription — still a redirect,
// because there is no subscription to update and no card guaranteed on file
router.post('/create-upgrade-session', authenticate, createUpgradeSession);
router.post('/verify-upgrade-session', authenticate, verifyUpgradeSession);

// Jobs add-on
router.post('/jobs-addon/checkout', authenticate, jobsAddonCheckout);
router.post('/jobs-addon/verify-session', authenticate, jobsAddonVerifySession);
router.post('/jobs-addon/cancel', authenticate, jobsAddonCancel);

// NOTE: The webhook route is mounted directly in server.ts
// with express.raw() body parser, not here with express.json()

export default router;
