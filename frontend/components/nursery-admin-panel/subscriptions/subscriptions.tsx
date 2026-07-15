'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminService, AdminCoupon, AdminSubscription } from '@/lib/api/admin';
import { toast } from 'sonner';

const TAB_OPTIONS = [
  { value: 'subscriptions', label: 'Nursery Plans' },
  { value: 'coupons', label: 'Coupons' },
  { value: 'invoices', label: 'Invoice History' },
  { value: 'plans', label: 'Plans & Pricing' },
];

const STATUS_STYLES: Record<AdminSubscription['status'], string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
};

const PLAN_LABELS: Record<string, string> = {
  standard: 'Standard',
  platinum: 'Platinum',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function namesOrFallback(items: Array<{ id: string; name: string }>, fallback: string) {
  if (items.length === 0) return fallback;
  return items.map((item) => item.name).join(', ');
}

export default function Subscriptions() {
  const [tab, setTab] = useState('subscriptions');
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    percentOff: '10',
    plans: ['standard', 'platinum'] as Array<'standard' | 'platinum'>,
  });

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminService.getSubscriptions();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load nursery plans');
      }
      setSubscriptions(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nursery plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const response = await adminService.getCoupons();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load coupons');
      }
      setCoupons(response.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load coupons');
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
    loadCoupons();
  }, [loadCoupons, loadSubscriptions]);

  const togglePlan = (plan: 'standard' | 'platinum') => {
    setCouponForm((current) => ({
      ...current,
      plans: current.plans.includes(plan)
        ? current.plans.filter((item) => item !== plan)
        : [...current.plans, plan],
    }));
  };

  const handleCreateCoupon = async () => {
    const percentOff = Number(couponForm.percentOff);
    if (!couponForm.code.trim() || percentOff <= 0 || percentOff > 100 || couponForm.plans.length === 0) {
      toast.error('Enter a valid code, percentage, and at least one plan');
      return;
    }

    setSavingCoupon(true);
    try {
      const response = await adminService.createCoupon({
        code: couponForm.code.trim().toUpperCase(),
        percentOff,
        plans: couponForm.plans,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create coupon');
      }
      setCoupons((current) => [response.data!, ...current]);
      setCouponForm({ code: '', percentOff: '10', plans: ['standard', 'platinum'] });
      setCouponDialogOpen(false);
      setTab('coupons');
      toast.success('Coupon created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeactivateCoupon = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Deactivate coupon ${coupon.code}?`)) return;
    try {
      const response = await adminService.deactivateCoupon(coupon.id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to deactivate coupon');
      }
      setCoupons((current) => current.map((item) => item.id === coupon.id ? response.data! : item));
      toast.success('Coupon deactivated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate coupon');
    }
  };

  const summary = useMemo(() => ({
    owners: subscriptions.length,
    groups: subscriptions.reduce((total, item) => total + item.groups.length, 0),
    nurseries: subscriptions.reduce((total, item) => total + item.nurseries.length, 0),
  }), [subscriptions]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-col items-start justify-between gap-4 bg-white px-6 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-medium text-secondary md:text-4xl lg:text-[48px] font-heading">
            <span className="text-foreground">SUBSCRIPTIONS</span> & BILLING
          </h2>
          <p className="text-muted-foreground">Nursery owner plans and account status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadSubscriptions(); loadCoupons(); }} disabled={loading || couponsLoading}>
            <RefreshCw className={`h-4 w-4 ${loading || couponsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCouponDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Generate Coupon
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nursery Owners</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary.owners}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Groups</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary.groups}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nurseries</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary.nurseries}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="block lg:hidden">
            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {TAB_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden lg:block">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-4 gap-2 bg-[#EFEFEF]">
                {TAB_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value} className="rounded-sm">
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {tab === 'subscriptions' && (
        <Card>
          <CardHeader><CardTitle>Nursery Plans</CardTitle></CardHeader>
          <CardContent>
            {error ? (
              <div className="py-10 text-center text-red-600">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="h-14 border-2 border-gray-300 bg-[#F8F8F8]">
                      <th className="p-3 text-left">Owner</th>
                      <th className="p-3 text-left">Groups</th>
                      <th className="p-3 text-left">Nurseries</th>
                      <th className="p-3 text-left">Plan</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Loading...</td></tr>
                    ) : subscriptions.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No nursery owner accounts found.</td></tr>
                    ) : subscriptions.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-5">
                          <p className="font-semibold">{item.ownerName || item.nurseryName || 'Nursery owner'}</p>
                          <p className="text-sm text-muted-foreground">{item.email}</p>
                        </td>
                        <td className="max-w-[240px] px-3 py-5 text-sm">{namesOrFallback(item.groups, 'No groups')}</td>
                        <td className="max-w-[240px] px-3 py-5 text-sm">{namesOrFallback(item.nurseries, 'No nurseries')}</td>
                        <td className="px-3 py-5 font-medium">{PLAN_LABELS[item.plan.toLowerCase()] || item.plan}</td>
                        <td className="px-3 py-5">
                          <Badge className={`${STATUS_STYLES[item.status]} capitalize`}>{item.status}</Badge>
                        </td>
                        <td className="px-3 py-5 text-sm text-muted-foreground">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card>
          <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
            Invoice records are not stored by the application. Payment history remains available in Stripe.
          </CardContent>
        </Card>
      )}

      {tab === 'coupons' && (
        <Card>
          <CardHeader><CardTitle>Coupons</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="h-14 border-2 border-gray-300 bg-[#F8F8F8]">
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Discount</th>
                    <th className="p-3 text-left">Plans</th>
                    <th className="p-3 text-left">Redemptions</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Created</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsLoading ? (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Loading...</td></tr>
                  ) : coupons.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No coupons created.</td></tr>
                  ) : coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-5 font-mono font-semibold">{coupon.code}</td>
                      <td className="px-3 py-5">{coupon.percentOff}%</td>
                      <td className="px-3 py-5">{coupon.plans.map((plan) => PLAN_LABELS[plan]).join(', ')}</td>
                      <td className="px-3 py-5">{coupon.timesRedeemed}</td>
                      <td className="px-3 py-5">
                        <Badge className={coupon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                          {coupon.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-5 text-sm text-muted-foreground">{formatDate(coupon.createdAt)}</td>
                      <td className="px-3 py-5">
                        {coupon.active && (
                          <Button variant="outline" size="sm" onClick={() => handleDeactivateCoupon(coupon)}>
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'plans' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Standard</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">GBP 23.95/month</p>
              <p className="mt-1 text-sm text-muted-foreground">GBP 287.40 annually</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Platinum</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">GBP 38.60/month</p>
              <p className="mt-1 text-sm text-muted-foreground">GBP 463.20 annually</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Coupon</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Coupon code</Label>
              <Input
                id="coupon-code"
                value={couponForm.code}
                onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                placeholder="WELCOME25"
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-percent">Discount percentage</Label>
              <Input
                id="coupon-percent"
                type="number"
                min="1"
                max="100"
                step="1"
                value={couponForm.percentOff}
                onChange={(event) => setCouponForm((current) => ({ ...current, percentOff: event.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <Label>Eligible plans</Label>
              {(['standard', 'platinum'] as const).map((plan) => (
                <label key={plan} className="flex items-center gap-3">
                  <Checkbox checked={couponForm.plans.includes(plan)} onCheckedChange={() => togglePlan(plan)} />
                  <span>{PLAN_LABELS[plan]}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDialogOpen(false)} disabled={savingCoupon}>Cancel</Button>
            <Button onClick={handleCreateCoupon} disabled={savingCoupon}>
              {savingCoupon ? 'Creating...' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
