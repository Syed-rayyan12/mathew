"use client";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 px-4 py-12">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardContent className="p-10 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src="/images/logo.png" className="w-52 object-contain" alt="Logo" />
          </div>

          {/* Cancelled Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Cancelled</h1>
            <p className="text-gray-500 mt-2 text-sm">
              No worries — your payment was not processed and you have not been charged.
            </p>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-600">
              You can go back and try again whenever you're ready. Your form data will need to be re-entered on the signup page.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Link href="/nursery-signup?plan=premium" className="block">
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-white py-5 font-semibold">
                <RefreshCw className="mr-2 w-4 h-4" />
                Try Again
              </Button>
            </Link>
            <Link href="/pricing" className="block">
              <Button variant="outline" className="w-full py-5">
                <ArrowLeft className="mr-2 w-4 h-4" />
                View Plans
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
