'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { adminService } from '@/lib/api/admin'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

const AdminSignInPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('adminRememberEmail')
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors = {
      email: '',
      password: '',
    }
    let isValid = true

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
      isValid = false
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
      isValid = false
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
      isValid = false
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: '',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)
    
    const loaderTimeout = setTimeout(() => {
      setShowLoader(true)
    }, 300)

    try {
      const response = await adminService.signin(formData.email, formData.password)

      console.log('Admin login response:', response)

      if (!response.success || !response.data) {
        throw new Error('Invalid credentials')
      }

      // Store admin token - response has nested data structure
      const adminData: any = response.data;
      
      console.log('Storing admin data:', {
        hasAccessToken: !!adminData.accessToken,
        role: adminData.role,
        email: adminData.email
      })

      // Use separate admin keys to avoid conflicts with regular user auth
      localStorage.setItem('adminAccessToken', adminData.accessToken)
      localStorage.setItem('adminRefreshToken', adminData.refreshToken || '')
      localStorage.setItem('adminRole', adminData.role)
      localStorage.setItem('adminEmail', adminData.email)
      localStorage.setItem('adminUser', JSON.stringify({
        email: adminData.email,
        role: adminData.role,
        firstName: 'Admin',
        lastName: 'User'
      }))

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('adminRememberEmail', formData.email)
      } else {
        localStorage.removeItem('adminRememberEmail')
      }

      toast.success('Welcome Admin!')

      setTimeout(() => {
        router.push('/admin-dashboard')
        clearTimeout(loaderTimeout)
        setShowLoader(false)
        setLoading(false)
      }, 1500)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password'
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
            <img src="/images/logo.png" className="w-60 object-cover" alt="Admin Logo" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mt-4">Admin Portal</h1>
          <p className="text-gray-600 mt-2">Sign in to manage the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={errors.email ? 'border-red-500' : ''}
            />
            <span className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.email ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
              <span className="text-red-500 text-sm block mt-1">{errors.email || ' '}</span>
            </span>
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
                required
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.password ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
              <span className="text-red-500 text-sm block mt-1">{errors.password || ' '}</span>
            </span>
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
            {loading ? 'Signing In...' : 'Admin Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Admin credentials required for access
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminSignInPage
