/**
 * Every payment, including renewals.
 *
 * This used to list Checkout Sessions, which only exist for the first payment.
 * Once plans renew, a session list shows the signup and nothing after it.
 *
 * The plan comes off the invoice line's price lookup key and the nursery count
 * off its quantity, so a Group of 8 and a Single Platinum are finally
 * distinguishable — they were both just "platinum" when this read metadata.
 */

import { NextFunction, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware';
import { getStripe } from '../utils/stripe';
import { parseLookupKey } from '../utils/pricing';
import { planLabel } from '../utils/entitlements';

export function lookupKeyOf(line: Stripe.InvoiceLineItem | null): string | null {
  const pricing = (line as any)?.pricing?.price_details;
  return (line as any)?.price?.lookup_key ?? pricing?.lookup_key ?? null;
}

/**
 * Picks the line that describes what was *bought* on this invoice.
 *
 * A single-line invoice (signup, renewal) has one parseable line — returned
 * as-is. A proration invoice has at least two: a negative credit for the
 * unused remainder of the old price and a positive charge for the new one.
 * data[0] is the credit, so the old approach named the plan the owner just
 * left. Taking the greatest amount picks the charge over the credit and is a
 * no-op for a single-line invoice. If every parseable line is negative (a pure
 * credit note), the least-negative is the closest thing to a subject that
 * invoice has. Lines with unrecognised keys are ignored — same intent as the
 * .filter in listPaymentHistory — so nothing outside this application can
 * accidentally become the plan name.
 */
export function planLine(lines: Stripe.InvoiceLineItem[]): Stripe.InvoiceLineItem | null {
  const parseable = lines.filter((l) => parseLookupKey(lookupKeyOf(l)) !== null);
  if (parseable.length === 0) return null;
  return parseable.reduce((best, l) => (l.amount > best.amount ? l : best));
}

function formatInvoice(invoice: Stripe.Invoice) {
  const line = planLine(invoice.lines?.data ?? []);
  const parsed = parseLookupKey(lookupKeyOf(line));
  const quantity = line?.quantity ?? 1;

  return {
    id: invoice.id,
    customerName: invoice.customer_name || null,
    customerEmail: invoice.customer_email || null,
    plan: parsed?.tier ?? null,
    planLabel: parsed
      ? planLabel({ planTier: parsed.tier, paidNurseryCount: quantity })
      : 'Unknown plan',
    quantity,
    billingPeriod: parsed?.billing ?? null,
    currency: invoice.currency || 'gbp',
    subtotal: invoice.subtotal ?? 0,
    discount: invoice.total_discount_amounts?.reduce((sum, d) => sum + d.amount, 0) ?? 0,
    total: invoice.total ?? 0,
    paymentStatus: invoice.status ?? 'draft',
    createdAt: new Date(invoice.created * 1000),
    invoiceNumber: invoice.number || null,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    invoicePdf: invoice.invoice_pdf || null,
    receiptUrl: null,
  };
}

export const listPaymentHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stripe = getStripe();
    const invoices: Stripe.Invoice[] = [];
    let startingAfter: string | undefined;

    do {
      const page = await stripe.invoices.list({
        limit: 100,
        starting_after: startingAfter,
      });
      invoices.push(...page.data);
      startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    } while (startingAfter);

    // Drafts are not payments yet. Everything else — paid, open, void,
    // uncollectible — is worth seeing, because a failed renewal is exactly
    // what someone is looking for when they open this table.
    const payments = invoices
      .filter((invoice) => invoice.status !== 'draft')
      .filter((invoice) => planLine(invoice.lines?.data ?? []) !== null)
      .map(formatInvoice);

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
