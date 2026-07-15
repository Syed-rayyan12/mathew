import { NextFunction, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware';
import { BadRequestError } from '../utils';
import { ensurePlanProducts, getStripe, PlanKey } from '../utils/stripe';

const VALID_PLANS: PlanKey[] = ['standard', 'platinum'];

function getCoupon(promotionCode: Stripe.PromotionCode): Stripe.Coupon | null {
  const coupon = promotionCode.promotion.coupon;
  return coupon && typeof coupon !== 'string' ? coupon : null;
}

function formatPromotionCode(promotionCode: Stripe.PromotionCode) {
  const coupon = getCoupon(promotionCode);
  const plans = (promotionCode.metadata?.plans || coupon?.metadata?.plans || '')
    .split(',')
    .filter((plan): plan is PlanKey => VALID_PLANS.includes(plan as PlanKey));

  return {
    id: promotionCode.id,
    code: promotionCode.code,
    active: promotionCode.active && Boolean(coupon?.valid),
    percentOff: coupon?.percent_off || 0,
    plans,
    timesRedeemed: promotionCode.times_redeemed,
    createdAt: new Date(promotionCode.created * 1000),
  };
}

export const listCoupons = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stripe = getStripe();
    const promotionCodes: Stripe.PromotionCode[] = [];
    let startingAfter: string | undefined;

    do {
      const page = await stripe.promotionCodes.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.promotion.coupon'],
      });
      promotionCodes.push(...page.data);
      startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    } while (startingAfter);

    res.json({
      success: true,
      data: promotionCodes
        .filter((item) => item.metadata?.mathew_coupon === 'true')
        .map(formatPromotionCode),
    });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const stripe = getStripe();
  let coupon: Stripe.Coupon | null = null;

  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const percentOff = Number(req.body.percentOff);
    const plans = Array.isArray(req.body.plans)
      ? [...new Set(req.body.plans.map((plan: unknown) => String(plan).toLowerCase()))]
      : [];

    if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
      throw new BadRequestError('Code must be 3-32 characters using letters, numbers, or hyphens');
    }
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      throw new BadRequestError('Discount percentage must be between 1 and 100');
    }
    if (plans.length === 0 || plans.some((plan) => !VALID_PLANS.includes(plan as PlanKey))) {
      throw new BadRequestError('Select at least one valid plan');
    }

    const products = await ensurePlanProducts();
    const selectedPlans = plans as PlanKey[];
    const metadata = {
      mathew_coupon: 'true',
      plans: selectedPlans.join(','),
    };

    coupon = await stripe.coupons.create({
      duration: 'once',
      name: `${code} - ${percentOff}% off`,
      percent_off: percentOff,
      applies_to: { products: selectedPlans.map((plan) => products[plan]) },
      metadata,
    });

    const promotionCode = await stripe.promotionCodes.create({
      code,
      active: true,
      promotion: { type: 'coupon', coupon: coupon.id },
      metadata,
      expand: ['promotion.coupon'],
    });

    res.status(201).json({ success: true, data: formatPromotionCode(promotionCode) });
  } catch (error) {
    if (coupon) {
      await stripe.coupons.del(coupon.id).catch(() => undefined);
    }
    if (error instanceof Stripe.errors.StripeError) {
      return next(new BadRequestError(error.message));
    }
    next(error);
  }
};

export const deactivateCoupon = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const promotionCode = await getStripe().promotionCodes.update(req.params.id, {
      active: false,
      expand: ['promotion.coupon'],
    });
    res.json({ success: true, data: formatPromotionCode(promotionCode) });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return next(new BadRequestError(error.message));
    }
    next(error);
  }
};
