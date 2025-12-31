"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, Plus, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [cardImagePreview, setCardImagePreview] = useState<string>('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [nurseryId, setNurseryId] = useState<string>('')

  const [formData, setFormData] = useState({
    nurseryName: '',
    address: '',
    city: '',
    postcode: '',
    aboutUs: '',
    description: '',
  })

  // Prevent back navigation after login
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Check authentication and load nursery data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const accessToken = localStorage.getItem('accessToken')
      const email = localStorage.getItem('email')
      const firstName = localStorage.getItem('firstName') || ''
      const lastName = localStorage.getItem('lastName') || ''
      const phone = localStorage.getItem('phone') || ''
      const nurseryName = localStorage.getItem('nurseryName') || ''

      console.log('🔑 Auth Check:', { 
        hasToken: !!accessToken, 
        email,
        firstName,
        lastName,
        phone,
        nurseryName
      })

      if (!accessToken || !email) {
        console.log('❌ No auth credentials found')
        toast.error('Please login to access settings')
        window.location.href = '/nursery-login'
        return
      }

      try {
        const { nurseryGroupService } = await import('@/lib/api/nursery-group')
        console.log('🔍 Fetching nursery group data...')
        const response = await nurseryGroupService.getMyGroup(accessToken)
        console.log('📦 Full API Response:', JSON.stringify(response, null, 2))

        if (response.success && response.data) {
          const group = response.data as any
          
          if (!group) {
            console.log('ℹ️ No group found, prefilling with user data')
            // Prefill with user data from localStorage
            setFormData({
              nurseryName: nurseryName,
              address: '',
              city: '',
              postcode: '',
              aboutUs: '',
              description: '',
            })
            setLoading(false)
            return
          }

          console.log('✅ Group data loaded:', group)

          setFormData({
            nurseryName: group.name || nurseryName,
            address: group.address || '',
            city: group.city || '',
            postcode: group.postcode || '',
            aboutUs: group.aboutUs || '',
            description: group.description || '',
          })

          // Store group ID for updates
          if (group.id) {
            setNurseryId(group.id)
          }

          if (group.logo) {
            setLogoPreview(group.logo)
          }

          if (group.cardImage) {
            setCardImagePreview(group.cardImage)
          }

          if (group.images && Array.isArray(group.images)) {
            setImagePreviews(group.images)
          }
        } else {
          console.log('❌ No group data in response, prefilling with localStorage')
          // Prefill with user data from localStorage when no group exists
          setFormData({
            nurseryName: nurseryName,
            address: '',
            city: '',
            postcode: '',
            aboutUs: '',
            description: '',
          })
        }
      } catch (error) {
        console.error('❌ Failed to load nursery data:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
        }
        // Even on error, prefill nurseryName from localStorage
        setFormData(prev => ({
          ...prev,
          nurseryName: nurseryName,
        }))
        toast.error('Failed to load nursery information')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleMultipleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const fileArray = Array.from(files)
      const newPreviews: string[] = []

      fileArray.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviews.push(reader.result as string)
          if (newPreviews.length === fileArray.length) {
            setImagePreviews([...imagePreviews, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImagePreviews(newPreviews)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { nurseryGroupService } = await import('@/lib/api/nursery-group')
      const token = localStorage.getItem('accessToken')

      if (!token) {
        throw new Error('Please login again')
      }

      // Prepare update data for nursery group
      const updateData = {
        nurseryId: nurseryId || undefined,
        name: formData.nurseryName,
        logo: logoPreview || undefined,
        cardImage: cardImagePreview || undefined,
        images: imagePreviews.filter(img => img !== ''),
        aboutUs: formData.aboutUs,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        postcode: formData.postcode,
      }

      const response = await nurseryGroupService.updateGroup(updateData, token)

      if (response.success) {
        toast.success('Nursery group updated successfully!')
        // Redirect to dashboard after successful update
        setTimeout(() => {
          router.push('/nursery-dashboard')
        }, 1500)
      } else {
        throw new Error(response.error || 'Update failed')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update group. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('email')
    toast.success('Logged out successfully')
    window.location.href = '/nursery-login'
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className='text-secondary font-medium text-[48px] font-heading'>
              <span className='text-foreground'>NURSERY </span>SETTINGS
            </h2>
            <p className="text-muted-foreground">Complete your nursery profile to get approved</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Logout
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className='bg-white rounded-xl p-8 space-y-8'>
            
            {/* Basic Information */}
            <div>
              <h3 className="text-2xl font-medium mb-4 text-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className='text-foreground mb-2' htmlFor="nurseryName">Nursery Name *</Label>
                  <Input
                    id="nurseryName"
                    name="nurseryName"
                    value={formData.nurseryName}
                    onChange={handleInputChange}
                    required
                    
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <h3 className="text-2xl font-medium text-foreground">Logo</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload your nursery group logo</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
                {logoPreview ? (
                  <div className="space-y-4">
                    <div className="relative group max-w-md mx-auto">
                      <div className="border-2 border-gray-200 rounded-lg h-48 overflow-hidden">
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setLogoPreview('')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">
                      <Upload size={18} />
                      <span>Change Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                    <Upload className="text-gray-400 mb-2" size={48} />
                    <span className="text-lg text-gray-600 mb-1">Upload Logo</span>
                    <span className="text-sm text-gray-500">Click to select your logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Card Image Upload */}
            <div>
              <h3 className="text-2xl font-medium text-foreground">Card Image</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload a single image that will appear on nursery cards in listings</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
                {cardImagePreview ? (
                  <div className="space-y-4">
                    <div className="relative group max-w-md mx-auto">
                      <div className="border-2 border-gray-200 rounded-lg h-48 overflow-hidden">
                        <img
                          src={cardImagePreview}
                          alt="Card Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCardImagePreview('')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">
                      <Upload size={18} />
                      <span>Change Card Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setCardImagePreview(reader.result as string)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                    <Upload className="text-gray-400 mb-2" size={48} />
                    <span className="text-lg text-gray-600 mb-1">Upload Card Image</span>
                    <span className="text-sm text-gray-500">Click to select a single image for cards</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setCardImagePreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Gallery Images Upload */}
            <div>
              <h3 className="text-2xl font-medium text-foreground">Gallery Images</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload multiple images for the slider on your nursery page</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
                {imagePreviews.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="border-2 border-gray-200 rounded-lg h-32 overflow-hidden">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                           
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">
                      <Plus size={18} />
                      <span>Add More Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleMultipleImageUpload}
                      
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                    <Upload className="text-gray-400 mb-2" size={48} />
                    <span className="text-lg text-gray-600 mb-1">Upload Images</span>
                    <span className="text-sm text-gray-500">Click to select multiple images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleMultipleImageUpload}
                    
                    />
                  </label>
                )}
              </div>
            </div>

            {/* About Us */}
            <div>
              <h3 className="text-2xl font-medium mb-4 text-foreground">About Your Nursery</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="aboutUs" className='mb-2'>About Us *</Label>
                  <Textarea
                    id="aboutUs"
                    name="aboutUs"
                    rows={4}
                    value={formData.aboutUs}
                    onChange={handleInputChange}
                    placeholder="Describe your nursery..."
                    required
                   
                  />
                </div>
                <div>
                  <Label htmlFor="description" className='mb-2'>Short Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="A brief description for cards and listings..."
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-2xl font-medium mb-4 text-foreground">Location</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label className='text-foreground mb-2' htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter street address"
                    required
                   
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="city" className='mb-2'>City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      required
                    
                    />
                  </div>
                  <div>
                    <Label htmlFor="postcode" className='mb-2'>Postcode *</Label>
                    <Input
                      id="postcode"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleInputChange}
                      placeholder="Enter postcode"
                      required
                    
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-white py-6 text-lg font-semibold"
                
              >
                {loading ? 'Saving...' : 'Save & Continue to Dashboard'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/nursery-dashboard')}
                
              >
                Skip for Now
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  )
}
