'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api/auth'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'

const SignupPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
  })
  const [loading, setLoading] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)

  // Check if already authenticated, redirect to home
  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.replace('/')
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Format UK phone number as user types
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '')
      let formatted = ''
      
      if (cleaned.startsWith('44')) {
        // Format: +44 XXXX XXXXXX
        formatted = '+44'
        if (cleaned.length > 2) formatted += ' ' + cleaned.substring(2, 6)
        if (cleaned.length > 6) formatted += ' ' + cleaned.substring(6, 12)
      } else if (cleaned.startsWith('0')) {
        // Format: 0XXXX XXXXXX
        formatted = cleaned.substring(0, 5)
        if (cleaned.length > 5) formatted += ' ' + cleaned.substring(5, 11)
      } else if (value.startsWith('+44')) {
        formatted = value
      } else {
        formatted = cleaned.substring(0, 11)
      }
      
      setFormData({ ...formData, [name]: formatted })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const validateUKPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '')
    // UK formats: +44XXXXXXXXXX (10-11 digits after +44) or 0XXXXXXXXXX (10-11 digits starting with 0)
    const ukPhoneRegex = /^(\+44[1-9]\d{9,10}|0[1-9]\d{9,10})$/
    return ukPhoneRegex.test(cleaned)
  }

  const getLocation = async () => {
  // Prevent double clicks
  if (locationLoading) return;

  setLocationLoading(true);

  // Browser support check
  if (!navigator.geolocation) {
    toast.error('Geolocation is not supported by your browser');
    setLocationLoading(false);
    return;
  }

  // Permission pre-check (Chrome / Edge)
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        toast.error('Location permission is denied. Please enable it in browser settings.');
        setLocationLoading(false);
        return;
      }
    }
  } catch (err) {
    // Safari fallback – ignore
  }

  toast.info('Fetching your current location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        // Reverse geocoding (OpenStreetMap)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MathewNursery/1.0'
            }
          }
        );

        if (!response.ok) throw new Error('Reverse geocoding failed');

        const data = await response.json();

        // UK validation (optional but recommended)
        if (data.address?.country_code !== 'gb') {
          toast.error('Please select a UK location');
          setLocationLoading(false);
          return;
        }

        if (data.display_name) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name,
            latitude,
            longitude
          }));

          toast.success('Location fetched successfully!');
        } else {
          toast.warning('Address not found. Please enter manually.');
        }
      } catch (error) {
        console.error('Location error:', error);
        toast.error('Unable to fetch address. Please enter it manually.');
      } finally {
        setLocationLoading(false);
      }
    },
    (error) => {
      let message = 'Unable to access location. ';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message += 'Please allow location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          message += 'Location unavailable.';
          break;
        case error.TIMEOUT:
          message += 'Location request timed out.';
          break;
        default:
          message += 'Please enter address manually.';
      }

      toast.error(message);
      setLocationLoading(false);
    },
    {
      enableHighAccuracy: false, // 🔥 IMPORTANT
      timeout: 15000,
      maximumAge: 30000
    }
  );
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate UK phone format
    if (!validateUKPhone(formData.phone)) {
      setError('Please enter a valid UK phone number (e.g., +44 7123 456789 or 07123 456789)')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    
    // Delay showing loader by 300ms to avoid flashing for quick responses
    const loaderTimeout = setTimeout(() => {
      setShowLoader(true)
    }, 300)

    try {
      const response = await authService.userSignup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'USER',
      })

      if (!response.success) {
        throw new Error(response.error || 'Signup failed')
      }

      // Check if account needs approval
      if (response.data?.pendingApproval) {
        toast.success('Account created successfully! Your account is pending admin approval. You will receive a notification once approved.')
      } else {
        toast.success('Account created successfully! Redirecting to login...')
      }
      
      // Redirect to login page
      setTimeout(() => {
        router.push('/user-signIn')
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
    } finally {
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
          <p className="text-gray-600">Join us and find the perfect nursery</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

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
            <Label htmlFor="phone">Phone Number (UK Only)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+44 7123 456789 or 07123 456789"
              value={formData.phone}
              onChange={handleChange}
              maxLength={17}
              required
            />
            <p className="text-xs text-gray-500">UK phone numbers only</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Enter your address or use location"
                value={formData.address}
                onChange={handleChange}
                className="pr-10"
              />
              <button
                type="button"
                onClick={getLocation}
                disabled={locationLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Get current location"
              >
                <MapPin className={`h-5 w-5 text-secondary ${locationLoading ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500">Click the location icon to auto-fill your address</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

       

          <Button
            type="submit"
            className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-lg font-medium"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/user-signIn" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </p>
     
        </div>
      </div>
    </div>
  )
}

export default SignupPage
