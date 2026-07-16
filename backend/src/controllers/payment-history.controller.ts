import { NextFunction, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware';
import { getStripe, PlanKey } from '../utils/stripe';

const VALID_PLANS: PlanKey[] = ['standard', 'platinum'];

function getPlan(session: Stripe.Checkout.Session): PlanKey | null {
  const plan = session.metadata?.plan?.toLowerCase();
  return VALID_PLANS.includes(plan as PlanKey) ? plan as PlanKey : null;
}

function inferBillingPeriod(plan: PlanKey, subtotal: number | null): 'monthly' | 'annual' | null {
  const annualSubtotals: Record<PlanKey, number> = {
    standard: 28740,
    platinum: 46320,
  };
  const monthlySubtotals: Record<PlanKey, number> = {
    standard: 2395,
    platinum: 3860,
  };

  if (subtotal === annualSubtotals[plan]) return 'annual';
  if (subtotal === monthlySubtotals[plan]) return 'monthly';
  return null;
}

function getInvoice(session: Stripe.Checkout.Session): Stripe.Invoice | null {
  return session.invoice && typeof session.invoice !== 'string' ? session.invoice : null;
}

function getReceiptUrl(session: Stripe.Checkout.Session): string | null {
  if (!session.payment_intent || typeof session.payment_intent === 'string') return null;
  const charge = session.payment_intent.latest_charge;
  return charge && typeof charge !== 'string' ? charge.receipt_url : null;
}

function formatPayment(session: Stripe.Checkout.Session, plan: PlanKey) {
  const invoice = getInvoice(session);
  const billingPeriod = session.metadata?.billingPeriod === 'annual' || session.metadata?.billingPeriod === 'monthly'
    ? session.metadata.billingPeriod
    : inferBillingPeriod(plan, session.amount_subtotal);

  return {
    id: session.id,
    customerName: session.customer_details?.name
      || [session.metadata?.firstName, session.metadata?.lastName].filter(Boolean).join(' ')
      || null,
    customerEmail: session.customer_details?.email || session.customer_email || session.metadata?.email || null,
    plan,
    billingPeriod,
    currency: session.currency || 'gbp',
    subtotal: session.amount_subtotal || 0,
    discount: session.total_details?.amount_discount || 0,
    total: session.amount_total || 0,
    paymentStatus: session.payment_status,
    createdAt: new Date(session.created * 1000),
    invoiceNumber: invoice?.number || null,
    hostedInvoiceUrl: invoice?.hosted_invoice_url || null,
    invoicePdf: invoice?.invoice_pdf || null,
    receiptUrl: getReceiptUrl(session),
  };
}

export const listPaymentHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stripe = getStripe();
    const sessions: Stripe.Checkout.Session[] = [];
    let startingAfter: string | undefined;

    do {
      const page = await stripe.checkout.sessions.list({
        limit: 100,
        status: 'complete',
        starting_after: startingAfter,
        expand: ['data.invoice', 'data.payment_intent.latest_charge'],
      });
      sessions.push(...page.data);
      startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    } while (startingAfter);

    const payments = sessions
      .map((session) => ({ session, plan: getPlan(session) }))
      .filter((item): item is { session: Stripe.Checkout.Session; plan: PlanKey } => Boolean(item.plan))
      .filter(({ session }) => ['paid', 'no_payment_required'].includes(session.payment_status))
      .map(({ session, plan }) => formatPayment(session, plan));

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
