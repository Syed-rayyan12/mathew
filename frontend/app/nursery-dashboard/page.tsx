"use client"

import ManageNursery from '@/components/nursery-dashboard-panel/manage-nursery'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const Page = () => {
  const router = useRouter()

  // Prevent back navigation after login
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    const email = localStorage.getItem('email')
    
    if (!accessToken || !email) {
      toast.error('Please login to access dashboard')
      window.location.href = '/nursery-login'
    }
  }, [router])

  return <ManageNursery />
}

export default Page
