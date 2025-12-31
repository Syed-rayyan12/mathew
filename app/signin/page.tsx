'use client'

import Link from "next/link";
import { User, Building2 } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome Back
          </h1>
          <p className="text-lg text-gray-600">
            Please select your account type to continue
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Parent Login Card */}
          <Link href="/user-signIn">
            <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer group hover:-translate-y-2 border-2 border-transparent hover:border-primary">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                  <User className="w-12 h-12 text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Parent Login
                </h2>
                <p className="text-gray-600 mb-6">
                  Access your account to find nurseries, submit reviews, and manage your preferences
                </p>
                <div className="inline-flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continue as Parent
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Nursery Login Card */}
          <Link href="/nursery-login">
            <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer group hover:-translate-y-2 border-2 border-transparent hover:border-secondary">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-secondary transition-colors duration-300">
                  <Building2 className="w-12 h-12 text-secondary group-hover:text-white transition-colors duration-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Nursery Login
                </h2>
                <p className="text-gray-600 mb-6">
                  Manage your nursery profile, respond to reviews, and update your information
                </p>
                <div className="inline-flex items-center text-secondary font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continue as Nursery
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

       
      </div>
    </div>
  );
}
