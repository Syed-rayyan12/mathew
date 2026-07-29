import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Newsletter signups go straight to Resend — the contact lands in a Segment
// (the list Matt actually mails later) and a heads-up email goes to the inbox
// so signups are visible as they arrive. Nothing is stored in our own database.
//
// Resend replaced Audiences with Segments: contacts are now global, and a
// segment is just a grouping applied to them. `audienceId` still exists on the
// SDK but is deprecated, and it type-checks silently via an overload — so use
// `segments` and don't be fooled by a clean tsc run.
// https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments

export const runtime = 'nodejs';

type SubscriberType = 'FAMILY' | 'NURSERY';

interface SubscribePayload {
  name?: string;
  email?: string;
  phone?: string;
  type?: SubscriberType;
  organisation?: string;
  consent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEGMENT_IDS: Record<SubscriberType, string | undefined> = {
  FAMILY: process.env.RESEND_SEGMENT_FAMILY_ID,
  NURSERY: process.env.RESEND_SEGMENT_NURSERY_ID,
};

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

/** Resend contacts only take first/last name, so split on the first space. */
function splitName(name: string) {
  const [firstName, ...rest] = name.split(' ').filter(Boolean);
  return { firstName, lastName: rest.join(' ') || undefined };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  let body: SubscribePayload;

  try {
    body = await req.json();
  } catch {
    return fail('Invalid request.');
  }

  const name = body.name?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const phone = body.phone?.trim() ?? '';
  const type = body.type;
  const organisation = body.organisation?.trim() ?? '';

  // Matt's requirement: every field is mandatory.
  if (!name) return fail('Please enter your name.');
  if (!email) return fail('Please enter your email address.');
  if (!EMAIL_RE.test(email)) return fail('Please enter a valid email address.');
  if (!phone) return fail('Please enter your telephone number.');
  if (type !== 'FAMILY' && type !== 'NURSERY') {
    return fail('Please tell us whether you are a family or a nursery.');
  }
  if (type === 'NURSERY' && !organisation) {
    return fail('Please enter your nursery or group name.');
  }
  if (body.consent !== true) {
    return fail('Please agree to receive emails from us.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = SEGMENT_IDS[type];
  const from = process.env.RESEND_FROM;
  const notifyTo = process.env.RESEND_NOTIFY_TO;

  if (!apiKey || !segmentId) {
    // Misconfiguration is ours, not the visitor's — don't blame them for it.
    console.error(
      `[subscribe] missing config: ${!apiKey ? 'RESEND_API_KEY ' : ''}${!segmentId ? `RESEND_SEGMENT_${type}_ID` : ''}`
    );
    return fail('Subscriptions are temporarily unavailable. Please try again later.', 503);
  }

  const resend = new Resend(apiKey);
  const { firstName, lastName } = splitName(name);

  const base = {
    email,
    firstName,
    lastName,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  };

  // Phone and nursery name have nowhere else to live now there's no database,
  // so hang them off the contact as properties. Resend may reject keys that
  // haven't been declared on the account, and losing the signup over a missing
  // property would be a poor trade — so fall back to a bare contact.
  const properties = {
    phone,
    subscriber_type: type === 'NURSERY' ? 'Nursery' : 'Family',
    ...(type === 'NURSERY' ? { nursery_name: organisation } : {}),
  };

  try {
    let { error } = await resend.contacts.create({ ...base, properties });

    if (error) {
      console.warn('[subscribe] create with properties failed, retrying bare:', error);
      ({ error } = await resend.contacts.create(base));
    }

    if (error) {
      console.error('[subscribe] resend.contacts.create failed:', error);
      return fail('We could not complete your subscription. Please try again.', 502);
    }
  } catch (err) {
    console.error('[subscribe] resend.contacts.create threw:', err);
    return fail('We could not complete your subscription. Please try again.', 502);
  }

  // Notification is a nice-to-have. They're already on the list, so a failure
  // here must not surface as a failed signup.
  if (from && notifyTo) {
    try {
      await resend.emails.send({
        from,
        to: notifyTo,
        replyTo: email,
        subject: `New ${type === 'NURSERY' ? 'nursery' : 'family'} subscriber: ${name}`,
        html: `
          <h2>New subscriber</h2>
          <table cellpadding="6" style="border-collapse:collapse">
            <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
            <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
            <tr><td><strong>Telephone</strong></td><td>${escapeHtml(phone)}</td></tr>
            <tr><td><strong>Type</strong></td><td>${type === 'NURSERY' ? 'Nursery' : 'Family'}</td></tr>
            ${
              type === 'NURSERY'
                ? `<tr><td><strong>Nursery / group</strong></td><td>${escapeHtml(organisation)}</td></tr>`
                : ''
            }
          </table>
          <p style="color:#666;font-size:13px">Added to the ${
            type === 'NURSERY' ? 'Nurseries' : 'Families'
          } segment in Resend.</p>
        `,
      });
    } catch (err) {
      console.error('[subscribe] notification email failed:', err);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Thanks for subscribing — you're on the list.",
  });
}
