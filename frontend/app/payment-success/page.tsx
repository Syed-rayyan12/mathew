"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  const router = useRouter();

  // Auto-redirect to login after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/nursery-login");
    }, 10000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 px-4 py-12">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardContent className="p-10 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src="/images/logo.png" className="w-52 object-contain" alt="Logo" />
          </div>

          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Thank you for subscribing to the <span className="font-semibold text-secondary">Premium Plan</span>
            </p>
          </div>

          {/* Info Cards */}
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Account Created</p>
                <p className="text-xs text-gray-500 mt-0.5">Your nursery account has been created successfully.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Pending Admin Approval</p>
                <p className="text-xs text-gray-500 mt-0.5">Your account is under review. You'll be notified once it's approved — usually within 24 hours.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-4">
              <Mail className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Check Your Email</p>
                <p className="text-xs text-gray-500 mt-0.5">You'll receive a confirmation email from Stripe and a welcome email from us.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Link href="/nursery-login" className="block">
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-white py-5 font-semibold">
                Go to Nursery Login
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full py-5">
                Back to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            You will be automatically redirected to the login page in 10 seconds.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
