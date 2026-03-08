'use client'
import React, { useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { MapPin, Star, Trash2 } from 'lucide-react'
import { shortlistService, ShortlistedNursery } from '@/lib/api/shortlist'
import { toast } from 'sonner'
import Link from 'next/link'

function ShortListed() {
    const [shortlist, setShortlist] = useState<ShortlistedNursery[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [removing, setRemoving] = useState<string | null>(null)

    useEffect(() => {
        const fetchShortlist = async () => {
            try {
                const response = await shortlistService.getMyShortlist()
                if (response.success && response.data) {
                    setShortlist(response.data)
                }
            } catch (error) {
                toast.error('Failed to load shortlist')
            } finally {
                setLoading(false)
            }
        }
        fetchShortlist()
    }, [])

    const handleRemove = async (nurseryId: string) => {
        setRemoving(nurseryId)
        try {
            await shortlistService.removeFromShortlist(nurseryId)
            setShortlist(prev => prev.filter(item => item.nursery.id !== nurseryId))
            toast.success('Removed from shortlist')
        } catch (error) {
            toast.error('Failed to remove from shortlist')
        } finally {
            setRemoving(null)
        }
    }

    const filtered = shortlist.filter(item =>
        item.nursery.name.toLowerCase().includes(search.toLowerCase()) ||
        item.nursery.city.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <>
            <div>
                <h2 className='text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading'>
                    <span className='text-foreground'>MY</span> SHORTLIST
                </h2>
                <p>Manage your saved nurseries and compare options</p>
                <div className='pt-4'>
                    <Input
                        placeholder='Search your shortlisted nurseries...'
                        className='w-full md:w-[50%] rounded-md h-9 bg-white'
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mt-6'>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className='bg-white rounded-md p-3 animate-pulse flex flex-col gap-4'>
                                <div className='h-40 bg-gray-200 rounded-md' />
                                <div className='h-4 bg-gray-200 rounded w-3/4' />
                                <div className='h-4 bg-gray-200 rounded w-1/2' />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className='mt-12 text-center text-gray-400'>
                        <p className='text-lg'>
                            {search ? 'No nurseries match your search.' : 'You have no shortlisted nurseries yet.'}
                        </p>
                        {!search && (
                            <Link href='/products' className='mt-4 inline-block text-secondary underline'>
                                Browse nurseries
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4'>
                        {filtered.map(item => (
                            <div key={item.id} className='bg-white rounded-md p-3 mt-6 flex flex-col gap-4'>
                                <img
                                    src={item.nursery.cardImage || '/images/list 1.png'}
                                    alt={item.nursery.name}
                                    className='w-full h-40 object-cover rounded-md'
                                />
                                <div className='flex flex-col gap-3'>
                                    <h3 className='text-xl font-medium font-heading line-clamp-1'>
                                        {item.nursery.name}
                                    </h3>
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='size-4 shrink-0' />
                                        <span className='text-sm truncate'>
                                            {item.nursery.town ? `${item.nursery.town}, ` : ''}{item.nursery.city}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <Star className='size-4 text-yellow-400 fill-yellow-400 shrink-0' />
                                        <span className='text-sm'>
                                            {item.nursery.averageRating > 0
                                                ? `${item.nursery.averageRating} / 5`
                                                : 'No ratings yet'}
                                            {item.nursery.reviewCount > 0 && (
                                                <span className='text-gray-400 ml-1'>({item.nursery.reviewCount})</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className='flex gap-3 mt-3 justify-between items-center'>
                                        <Link
                                            href={`/products/${item.nursery.slug}`}
                                            className='bg-secondary text-primary-foreground rounded-md px-6 py-2 text-sm text-center flex-1'
                                        >
                                            View Profile
                                        </Link>
                                        <button
                                            onClick={() => handleRemove(item.nursery.id)}
                                            disabled={removing === item.nursery.id}
                                            className='border border-gray-400 text-foreground rounded-md px-2 py-2 hover:bg-red-50 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50'
                                        >
                                            <Trash2 className='w-5 h-5' />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

export default ShortListed

