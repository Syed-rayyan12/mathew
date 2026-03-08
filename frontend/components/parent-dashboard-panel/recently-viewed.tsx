'use client'
import React, { useEffect, useState } from 'react'
import { MapPin, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { recentlyViewedService, RecentlyViewedEntry } from '@/lib/api/recently-viewed'
import { toast } from 'sonner'
import Link from 'next/link'

function RecentlyViewed() {
    const [items, setItems] = useState<RecentlyViewedEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await recentlyViewedService.getRecentlyViewed()
                if (res.success && res.data) setItems(res.data)
            } catch {
                // silent
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [])

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        const hrs = Math.floor(mins / 60)
        const days = Math.floor(hrs / 24)
        if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
        if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`
        return `${days} day${days !== 1 ? 's' : ''} ago`
    }

    const handleClearAll = async () => {
        try {
            await recentlyViewedService.clearAll()
            setItems([])
            toast.success('Recently viewed cleared')
        } catch {
            toast.error('Failed to clear')
        }
    }

    return (
        <>
            <div>
                <div className='flex justify-between items-center'>
                    <div>
                        <h2 className='text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading'>
                            <span className='text-foreground'>RECENTLY </span>VIEWED
                        </h2>
                        <p>Nurseries you&apos;ve recently visited</p>
                    </div>
                    {items.length > 0 && (
                        <Button
                            onClick={handleClearAll}
                            className='border rounded-md bg-transparent text-red-500 px-6 py-2 border-red-500 hover:bg-red-50'
                        >
                            Clear All
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className='flex flex-col gap-4 mt-6'>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className='bg-white rounded-md p-3 flex justify-between items-center gap-4 animate-pulse'>
                                <div className='flex gap-2 items-center'>
                                    <div className='w-24 h-20 bg-gray-200 rounded-md' />
                                    <div className='flex flex-col gap-2'>
                                        <div className='h-4 w-36 bg-gray-200 rounded' />
                                        <div className='h-3 w-24 bg-gray-200 rounded' />
                                    </div>
                                </div>
                                <div className='h-8 w-24 bg-gray-200 rounded' />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className='mt-12 text-center text-gray-400'>
                        <p className='text-lg'>No recently viewed nurseries yet.</p>
                        <Link href='/products' className='mt-4 inline-block text-secondary underline'>
                            Browse nurseries
                        </Link>
                    </div>
                ) : (
                    <div className='flex flex-col'>
                        {items.map(item => (
                            <div key={item.id} className='bg-white rounded-md p-3 mt-4 flex justify-between items-center gap-4'>
                                <div className='flex gap-3 items-center'>
                                    <img
                                        src={item.nursery.cardImage || '/images/list 1.png'}
                                        alt={item.nursery.name}
                                        className='w-24 h-20 object-cover rounded-md shrink-0'
                                    />
                                    <div className='flex flex-col gap-1'>
                                        <h3 className='text-lg font-medium font-heading line-clamp-1'>{item.nursery.name}</h3>
                                        <div className='flex items-center gap-2'>
                                            <MapPin className='size-4 text-gray-400 shrink-0' />
                                            <span className='text-gray-400 text-sm'>
                                                {item.nursery.town ? `${item.nursery.town}, ` : ''}{item.nursery.city}
                                            </span>
                                        </div>
                                        <span className='text-gray-400 text-sm'>
                                            Viewed {formatTimeAgo(item.viewedAt)}
                                        </span>
                                    </div>
                                </div>
                                <Link
                                    href={`/products/${item.nursery.slug}`}
                                    className='bg-secondary text-white rounded-md px-4 py-2 text-sm shrink-0 hover:bg-secondary/90 transition-colors'
                                >
                                    View Profile
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

export default RecentlyViewed;

