'use client';

/**
 * Admin account settings — change the login email and the password.
 *
 * Both actions require the current password. The admin used to be two
 * constants compiled into the backend, so neither was possible without a
 * deploy; it is now an ordinary User row and uses the same endpoints as
 * every other account.
 *
 * There is no password recovery yet. Changing the email here changes where a
 * future recovery link would go, so it is deliberately as guarded as the
 * password change.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/lib/api/admin';
import { ApiException } from '@/lib/api/client';
import { toast } from 'sonner';

const MIN_PASSWORD_LENGTH = 12;

/** Turns whatever the client threw into something worth showing a human. */
const messageFor = (err: unknown, fallback: string) =>
  err instanceof ApiException || err instanceof Error ? err.message : fallback;

export default function AdminSettings() {
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [emailSaving, setEmailSaving] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwSaving, setPwSaving] = useState(false);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.newEmail.trim() || !emailForm.currentPassword) {
      toast.error('Enter the new email address and your current password.');
      return;
    }

    setEmailSaving(true);
    try {
      const res = await adminService.changeEmail(
        emailForm.currentPassword,
        emailForm.newEmail.trim()
      );
      if (!res.success) throw new Error(res.message || 'Could not change the email address.');
      toast.success('Email updated. Use it next time you sign in.');
      setEmailForm({ newEmail: '', currentPassword: '' });
    } catch (err) {
      toast.error(messageFor(err, 'Could not change the email address.'));
    } finally {
      setEmailSaving(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pwForm.newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('The two new passwords do not match.');
      return;
    }
    if (pwForm.newPassword === pwForm.currentPassword) {
      toast.error('The new password must be different from the current one.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await adminService.changePassword(pwForm.currentPassword, pwForm.newPassword);
      if (!res.success) throw new Error(res.message || 'Could not change the password.');
      toast.success('Password changed.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(messageFor(err, 'Could not change the password.'));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your admin login. Both changes ask for your current password.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        There is no password recovery yet. If you forget this password, getting
        back in means editing the database directly — so store it somewhere safe.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email address</CardTitle>
          <CardDescription>
            This is the address you sign in with. It takes effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New email address</Label>
              <Input
                id="newEmail"
                type="email"
                autoComplete="username"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                disabled={emailSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailCurrentPassword">Current password</Label>
              <Input
                id="emailCurrentPassword"
                type="password"
                autoComplete="current-password"
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                disabled={emailSaving}
              />
            </div>
            <Button type="submit" disabled={emailSaving}>
              {emailSaving ? 'Saving…' : 'Change email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            At least {MIN_PASSWORD_LENGTH} characters. You stay signed in afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                disabled={pwSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                disabled={pwSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                disabled={pwSaving}
              />
            </div>
            <Button type="submit" disabled={pwSaving}>
              {pwSaving ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
