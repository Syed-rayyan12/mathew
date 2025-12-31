'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star } from 'lucide-react'
import { nurseryDashboardService, Review, ReviewStats, Nursery } from '@/lib/api/nursery'
import { toast } from 'sonner'

// ✅ Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase()
  const statusStyles: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  }

  const badgeStyle = statusStyles[normalizedStatus] || 'bg-gray-100 text-gray-700'

  return (
    <Badge className={`capitalize px-3 py-1 text-sm font-medium rounded-full ${badgeStyle}`}>
      {status}
    </Badge>
  )
}

// Render stars based on rating
function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400 opacity-50'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export default function ReviewsOverview() {
  const [nurseries, setNurseries] = useState<Nursery[]>([])
  const [selectedNurseryId, setSelectedNurseryId] = useState<string>('')
  const [reviewsByNursery, setReviewsByNursery] = useState<Record<string, { reviews: Review[], stats: ReviewStats }>>({})
  const [loading, setLoading] = useState(true)
  const [processingReview, setProcessingReview] = useState<string | null>(null)

  useEffect(() => {
    fetchNurseriesAndReviews()
  }, [])

  const handleApproveReview = async (reviewId: string) => {
    setProcessingReview(reviewId)
    try {
      const response = await nurseryDashboardService.approveReview(reviewId)
      
      if (response.success) {
        toast.success('Review approved successfully')
        
        // Update the review status in local state without refetching
        setReviewsByNursery(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(nurseryId => {
            const nurseryData = updated[nurseryId]
            const reviewIndex = nurseryData.reviews.findIndex(r => r.id === reviewId)
            
            if (reviewIndex !== -1) {
              // Update the review status
              nurseryData.reviews[reviewIndex] = {
                ...nurseryData.reviews[reviewIndex],
                isApproved: true,
                isRejected: false
              }
              
              // Recalculate stats
              const approvedReviews = nurseryData.reviews.filter(r => r.isApproved && !r.isRejected)
              const pendingReviews = nurseryData.reviews.filter(r => !r.isApproved && !r.isRejected)
              const averageRating = approvedReviews.length > 0
                ? approvedReviews.reduce((sum, r) => sum + r.overallRating, 0) / approvedReviews.length
                : 0
              
              updated[nurseryId] = {
                ...nurseryData,
                stats: {
                  averageRating,
                  totalReviews: nurseryData.reviews.length,
                  pendingApproval: pendingReviews.length
                }
              }
            }
          })
          return updated
        })
      } else {
        throw new Error(response.error || 'Failed to approve review')
      }
    } catch (error) {
      console.error('Failed to approve review:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve review')
    } finally {
      setProcessingReview(null)
    }
  }

  const handleRejectReview = async (reviewId: string) => {
    setProcessingReview(reviewId)
    try {
      const response = await nurseryDashboardService.rejectReview(reviewId)
      
      if (response.success) {
        toast.success('Review rejected successfully')
        
        // Update the review status in local state without refetching
        setReviewsByNursery(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(nurseryId => {
            const nurseryData = updated[nurseryId]
            const reviewIndex = nurseryData.reviews.findIndex(r => r.id === reviewId)
            
            if (reviewIndex !== -1) {
              // Update the review status
              nurseryData.reviews[reviewIndex] = {
                ...nurseryData.reviews[reviewIndex],
                isApproved: false,
                isRejected: true
              }
              
              // Recalculate stats
              const approvedReviews = nurseryData.reviews.filter(r => r.isApproved && !r.isRejected)
              const pendingReviews = nurseryData.reviews.filter(r => !r.isApproved && !r.isRejected)
              const averageRating = approvedReviews.length > 0
                ? approvedReviews.reduce((sum, r) => sum + r.overallRating, 0) / approvedReviews.length
                : 0
              
              updated[nurseryId] = {
                ...nurseryData,
                stats: {
                  averageRating,
                  totalReviews: nurseryData.reviews.length,
                  pendingApproval: pendingReviews.length
                }
              }
            }
          })
          return updated
        })
      } else {
        throw new Error(response.error || 'Failed to reject review')
      }
    } catch (error) {
      console.error('Failed to reject review:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reject review')
    } finally {
      setProcessingReview(null)
    }
  }

  const fetchNurseriesAndReviews = async () => {
    try {
      // Fetch all user's nurseries
      const nurseriesResponse = await nurseryDashboardService.getMyNursery()
      
      if (nurseriesResponse.success && nurseriesResponse.data) {
        const nurseriesData: Nursery[] = Array.isArray(nurseriesResponse.data) 
          ? nurseriesResponse.data as Nursery[]
          : []
        
        setNurseries(nurseriesData)
        
        if (nurseriesData.length > 0) {
          setSelectedNurseryId(nurseriesData[0].id)
          
          // Fetch ALL reviews (approved, pending, rejected) using the nursery dashboard API
          const reviewsResponse = await nurseryDashboardService.getMyReviews()
          
          if (reviewsResponse.success && reviewsResponse.data) {
            const reviews = reviewsResponse.data.reviews
            const stats = reviewsResponse.data.stats
            
            // Group reviews by nursery ID
            const reviewsData: Record<string, { reviews: Review[], stats: ReviewStats }> = {}
            
            // Initialize all nurseries with empty reviews
            nurseriesData.forEach(nursery => {
              reviewsData[nursery.id] = {
                reviews: [],
                stats: { averageRating: 0, totalReviews: 0, pendingApproval: 0 }
              }
            })
            
            // Since backend returns reviews for first nursery only, assign to that nursery
            if (nurseriesData.length > 0) {
              reviewsData[nurseriesData[0].id] = {
                reviews: reviews || [],
                stats: stats || { averageRating: 0, totalReviews: 0, pendingApproval: 0 }
              }
            }
            
            setReviewsByNursery(reviewsData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch nurseries:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays === 1) return '1 day ago'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    )
  }

  if (nurseries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No nurseries found. Create a nursery first!</p>
      </div>
    )
  }

  const currentReviewData = reviewsByNursery[selectedNurseryId] || { 
    reviews: [], 
    stats: { averageRating: 0, totalReviews: 0, pendingApproval: 0 } 
  }

  const statsData = [
    {
      label: 'Average Rating',
      value: currentReviewData.stats.averageRating.toFixed(1),
      stars: (
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < Math.floor(currentReviewData.stats.averageRating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      ),
    },
    { label: 'Total Reviews', value: currentReviewData.stats.totalReviews.toString() },
    { label: 'Pending Approval', value: currentReviewData.stats.pendingApproval.toString() },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className='text-secondary font-medium text-[48px] font-heading'>
          <span className='text-foreground'>REVIEWS </span>MANAGEMENT
        </h2>
        <p className="text-muted-foreground">Manage reviews for all your nurseries</p>
      </div>

      {/* Nursery Tabs */}
      <Tabs value={selectedNurseryId} onValueChange={setSelectedNurseryId}>
        <TabsList className="w-full justify-start bg-gray-100 p-3 h-14 rounded-lg border border-gray-300">
          {nurseries.map((nursery) => (
            <TabsTrigger 
              key={nursery.id} 
              value={nursery.id}
              className="data-[state=active]:bg-secondary cursor-pointer data-[state=active]:text-white rounded-md px-4 py-5"
            >
              {nursery.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {nurseries.map((nursery) => (
          <TabsContent key={nursery.id} value={nursery.id} className="space-y-6 mt-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {statsData.map((item, index) => (
                <Card
                  key={index}
                  className="rounded-2xl shadow bg-white flex flex-col justify-between"
                >
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold font-sans text-[16px] text-gray-800">
                      {item.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center max-md: justify-between">
                    <span className="text-3xl font-semibold font-sans text-[36px] text-gray-900">
                      {item.value}
                    </span>
                    {item.stars && item.stars}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Reviews */}
            <Card className="rounded-2xl shadow bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold font-sans text-foreground">
                  Recent Reviews
                </CardTitle>
                <p className="text-sm text-gray-500">
                  See the latest feedback from parents for {nursery.name}.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {currentReviewData.reviews.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No reviews yet for this nursery</p>
                ) : (
                  currentReviewData.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border rounded-lg p-4 flex flex-col gap-3 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold font-sans text-foreground">
                            {review.initialsOnly 
                              ? `${review.firstName} ${review.lastName}`
                              : `${review.firstName} ${review.lastName}`
                            }
                          </h3>
                          <span className="text-xs text-gray-500">{formatTimeAgo(review.createdAt)}</span>
                        </div>
                        <StatusBadge status={
                          review.isRejected ? 'Rejected' : review.isApproved ? 'Approved' : 'Pending'
                        } />
                      </div>

                      <RatingStars rating={review.overallRating} />
                      <p className="text-sm text-gray-500">{review.content}</p>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApproveReview(review.id)}
                          disabled={processingReview === review.id || review.isApproved}
                          className={`px-4 py-2 text-white text-sm rounded-md transition disabled:cursor-not-allowed ${
                            review.isApproved
                              ? 'bg-green-400 opacity-60 cursor-default'
                              : 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                          }`}
                        >
                          {processingReview === review.id && !review.isRejected ? 'Processing...' : review.isApproved ? 'Approved ✓' : 'Approve Review'}
                        </button>
                        <button
                          onClick={() => handleRejectReview(review.id)}
                          disabled={processingReview === review.id || review.isRejected}
                          className={`px-4 py-2 text-white text-sm rounded-md transition disabled:cursor-not-allowed ${
                            review.isRejected
                              ? 'bg-red-400 opacity-60 cursor-default'
                              : 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                          }`}
                        >
                          {processingReview === review.id && !review.isApproved ? 'Processing...' : review.isRejected ? 'Rejected ✗' : 'Reject Review'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
