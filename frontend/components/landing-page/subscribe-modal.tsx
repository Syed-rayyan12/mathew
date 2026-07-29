'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SubscriberType = 'FAMILY' | 'NURSERY';

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the email when the visitor already typed one into the strip. */
  initialEmail?: string;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  organisation: '',
};

const SubscribeModal = ({ open, onOpenChange, initialEmail = '' }: SubscribeModalProps) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, email: initialEmail });
  const [type, setType] = useState<SubscriberType | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Keep the prefill in step with whatever they typed before opening the modal.
  React.useEffect(() => {
    if (open) setForm((prev) => ({ ...prev, email: initialEmail || prev.email }));
  }, [open, initialEmail]);

  const setField = (field: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const reset = () => {
    setForm({ ...EMPTY_FORM });
    setType(null);
    setConsent(false);
    setError(null);
    setDone(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!type) {
      setError('Please tell us whether you are a family or a nursery.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          type,
          organisation: type === 'NURSERY' ? form.organisation : undefined,
          consent,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDone(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const typeButtonClass = (value: SubscriberType) =>
    `flex-1 rounded-[6px] border-2 px-4 py-3 text-sm font-medium transition-colors ${
      type === value
        ? 'border-secondary bg-secondary text-white'
        : 'border-gray-300 text-gray-600 hover:border-secondary hover:text-secondary'
    }`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="py-6 text-center">
            <DialogTitle className="text-2xl font-heading font-medium mb-2">
              You&apos;re on the list
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Thanks for subscribing. Keep an eye on your inbox for nursery news and
              parenting tips.
            </DialogDescription>
            <Button
              onClick={() => handleOpenChange(false)}
              className="mt-6 bg-secondary hover:bg-secondary/90 text-white px-8"
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading font-medium">
                Subscribe to My Nursery
              </DialogTitle>
              <DialogDescription>
                Nursery updates, parenting advice and early learning insights, straight to
                your inbox.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="subscribe-name">Name</Label>
                <Input
                  id="subscribe-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={setField('name')}
                  disabled={submitting}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subscribe-email">Email</Label>
                <Input
                  id="subscribe-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={setField('email')}
                  disabled={submitting}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subscribe-phone">Telephone</Label>
                <Input
                  id="subscribe-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={setField('phone')}
                  disabled={submitting}
                  placeholder="01234 567890"
                />
              </div>

              <div className="space-y-1.5">
                <Label>I am a...</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setType('FAMILY')}
                    className={typeButtonClass('FAMILY')}
                    disabled={submitting}
                  >
                    Family
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('NURSERY')}
                    className={typeButtonClass('NURSERY')}
                    disabled={submitting}
                  >
                    Nursery
                  </button>
                </div>
              </div>

              {type === 'NURSERY' && (
                <div className="space-y-1.5">
                  <Label htmlFor="subscribe-organisation">Nursery or group name</Label>
                  <Input
                    id="subscribe-organisation"
                    type="text"
                    required
                    value={form.organisation}
                    onChange={setField('organisation')}
                    disabled={submitting}
                    placeholder="e.g. Little Acorns Nursery"
                  />
                </div>
              )}

              <label className="flex items-start gap-2.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 accent-[#04B0D6]"
                />
                <span>
                  I agree to receive emails from My Nursery and accept the{' '}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    className="text-secondary underline"
                  >
                    privacy policy
                  </Link>
                  . You can unsubscribe at any time.
                </span>
              </label>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-base font-medium disabled:opacity-60"
              >
                {submitting ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscribeModal;
