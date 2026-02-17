"use client"

import React, { useState, useEffect } from 'react'
import { Input } from '../ui/input'
import { MapPin, Star, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import AddNurseryModal from '../sharedComponents/add-nursery-modal'
import { useRouter } from 'next/navigation'
import { nurseryDashboardService } from '@/lib/api/nursery'
import { toast } from 'sonner'

export default function ManageNursery() {
  const [openModal, setOpenModal] = React.useState(false)
  const [nurseries, setNurseries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchNurseries()
  }, [])

  const fetchNurseries = async () => {
    try {
      console.log('Fetching nurseries from API...')
      const response = await nurseryDashboardService.getMyNursery()
      console.log('API Response:', response)
      if (response.success && response.data) {
        const nurseriesData = Array.isArray(response.data) ? response.data : [];
        // Filter only child nurseries (groupId is not null) - don't show parent groups
        const childNurseries = nurseriesData.filter(n => n.groupId !== null && n.groupId !== undefined);
        console.log('Total nurseries fetched:', nurseriesData.length)
        console.log('Child nurseries only:', childNurseries.length)
        console.log('Child nurseries data:', childNurseries)
        setNurseries(childNurseries)
      } else {
        console.log('No nurseries data in response')
      }
    } catch (error) {
      console.error('Failed to fetch nurseries:', error)
      toast.error('Failed to load nurseries')
    } finally {
      setLoading(false)
    }
  }

  const handleNurseryAdded = () => {
    // Refetch nurseries after adding a new one
    console.log('handleNurseryAdded called - refetching nurseries')
    fetchNurseries()
  }

  const handleDeleteNursery = async (nurseryId: string) => {
    try {
      const response = await nurseryDashboardService.deleteNursery(nurseryId)
      if (response.success) {
        setNurseries(nurseries.filter(n => n.id !== nurseryId))
        toast.success('Nursery deleted successfully')
      } else {
        toast.error('Failed to delete nursery')
      }
    } catch (error) {
      console.error('Failed to delete nursery:', error)
      toast.error('Failed to delete nursery')
    }
  }

  return (
    <>
      <div className=''>
        <div className=' bg-white rounded-md p-4 w-full flex justify-between items-center max-sm:flex-col max-sm:items-start gap-4'>
          <div className='flex flex-col gap-1 '>
            <h2 className='text-secondary font-medium text-[48px] font-heading'><span className='text-foreground'>MANAGE</span> NURSERY</h2>
            <p>Manage your saved nurseries and compare options</p>
            <div className='pt-4'>
              <Input placeholder='Search your shortlisted nurseries...' className='w-full rounded-md h-9 bg-white' />
            </div>
          </div>
          {/* <Button onClick={() => setOpenModal(true)} className='bg-secondary hover:bg-none'>
            Add New Nursery
          </Button> */}
        </div>

        <div className='mt-6  flex w-full gap-4 items-center'>
          {loading ? (
            <div className="text-center py-12 bg-white rounded-md w-full">
              <p className="text-muted-foreground">Loading nurseries...</p>
            </div>
          ) : nurseries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-md w-full">
              <p className="text-lg font-medium text-foreground mb-2">Create Your First Nursery</p>
              <p className="text-muted-foreground">Use the "Add New Nursery" button above to create your first nursery for this group.</p>
            </div>
          ) : (
            nurseries.map((nursery) => (
              <div key={nursery.id} className='bg-white rounded-md p-4 shadow-md'>
              
                  {/* Image */}
                  
                    <img 
                      src={nursery.cardImage || nursery.images?.[0] || '/images/list 1.png'} 
                      alt={nursery.name}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
              

                  {/* Content */}
                  <div className='flex flex-col gap-3 flex-1 justify-between'>
                    <div>
                      <h3 className='text-xl font-medium font-heading mb-3'>{nursery.name}</h3>
                      <div className='flex items-center gap-2 mb-2'>
                        <MapPin className='size-4' />
                        <span className='text-sm'>
                          {[nursery.town, nursery.city].filter(Boolean).join(', ')}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star 
                            key={i} 
                            className={i < Math.round(nursery.averageRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} 
                            size={16} 
                          />
                        ))}
                        <span className='text-sm'>({nursery.reviewCount || 0} reviews)</span>
                      </div>
                    </div>
                    
                    <div className='flex gap-3 items-center'>
                      <button 
                        onClick={() => router.push(`/nursery-dashboard/nursery-profile/${nursery.slug}`)} 
                        className='bg-secondary text-primary-foreground rounded-md px-9 py-2 hover:bg-secondary/90 transition-colors'
                      >
                        Update profile
                      </button>
                      <button 
                        onClick={() => handleDeleteNursery(nursery.id)}
                        className='border border-red-400 text-red-600 rounded-md px-2 py-2 hover:bg-red-50 transition-colors'
                      >
                        <Trash2 className='w-5 h-5' />
                      </button>
                    </div>
                  </div>
                
              </div>
            ))
          )}
        </div>
      </div>

      <AddNurseryModal open={openModal} onOpenChange={setOpenModal} onSuccess={handleNurseryAdded} />
    </>
  )
}