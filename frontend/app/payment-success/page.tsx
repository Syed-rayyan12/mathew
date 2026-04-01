"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Mail, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      // No session_id means this page was visited directly — treat as success
      // (the webhook may have already created the account)
      setStatus("success");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(data.message || "Account setup failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Network error. Please contact support.");
      });
  }, [searchParams]);

  // Auto-redirect after success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => router.push("/nursery-login"), 10000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 px-4 py-12">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardContent className="p-10 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src="/images/logo.png" className="w-52 object-contain" alt="Logo" />
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${status === "error" ? "bg-red-100" : "bg-green-100"}`}>
              {status === "verifying" ? (
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              ) : status === "error" ? (
                <AlertCircle className="w-12 h-12 text-red-600" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              )}
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {status === "verifying" ? "Setting Up Your Account…" : status === "error" ? "Setup Issue" : "Payment Successful!"}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              {status === "verifying"
                ? "Please wait while we create your nursery account."
                : status === "error"
                ? errorMsg
                : "Your nursery account has been created and is awaiting admin approval."}
            </p>
          </div>

          {/* Info Cards — only show on success */}
          {status === "success" && (
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
          )}

          {/* Actions */}
          {status !== "verifying" && (
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
          )}

          {status === "success" && (
            <p className="text-xs text-gray-400">
              You will be automatically redirected to the login page in 10 seconds.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100">
        <Loader2 className="w-12 h-12 text-secondary animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
