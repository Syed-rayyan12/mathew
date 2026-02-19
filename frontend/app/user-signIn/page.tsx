'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api/auth'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

const UserSignInPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Check if already authenticated, redirect to home
  useEffect(() => {
    if (authService.isAuthenticated()) { 
      router.replace('/')
      return;
    }

    // Load saved email if remember me was checked
    const savedEmail = localStorage.getItem('userRememberEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const getRedirectPath = (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return '/admin-dashboard'
      case 'NURSERY_OWNER':
        return '/nursery-dashboard'
      case 'PARENT':
        return '/parent-dashboard'
      default:
        return '/'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    // Delay showing loader by 300ms to avoid flashing for quick responses
    const loaderTimeout = setTimeout(() => {
      setShowLoader(true)
    }, 300)

    try {
      const response = await authService.userSignin({
        email: formData.email,
        password: formData.password,
      })

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed')
      }

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('userRememberEmail', formData.email);
      } else {
        localStorage.removeItem('userRememberEmail');
      }

      toast.success(`Welcome back, ${response.data.user.firstName}!`)

      // Keep loader visible during redirect
      // Navigate to home page without full page reload
      setTimeout(() => {
        router.push('/')
        clearTimeout(loaderTimeout)
        setShowLoader(false)
        setLoading(false)
      }, 2000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      toast.error(errorMessage)
      clearTimeout(loaderTimeout)
      setShowLoader(false)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 relative">
        {showLoader && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-secondary border-t-transparent rounded-full animate-spin transform rotate-45"></div>
              <div className="absolute inset-2 border-4 border-primary border-b-transparent rounded-full animate-spin transform -rotate-45" style={{ animationDirection: 'reverse' }}></div>
            </div>
          </div>
        )}
        <div className="text-center mb-8">
           <div className="flex justify-center items-center">

           <img src="/images/logo.png" className="w-60 object-cover" alt="Nursery Logo" />
          </div>
          <p className="text-gray-600 mt-4">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-normal cursor-pointer"
            >
              Remember my email
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-lg font-medium"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/user-signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </p>
          
         
        </div>
      </div>
    </div>
  )
}

export default UserSignInPage;
