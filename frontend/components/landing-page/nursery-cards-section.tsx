'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nurseryService } from '@/lib/api/nursery';

interface NurseryCardData {
    id: string;
    name: string;
    slug: string;
    cardImage?: string;
    reviewCount: number;
    description?: string;
    groupId?: string | null;
    group?: {
        name: string;
        slug: string;
    };
}

const NurseryCardsSection = () => {
    const [nurseries, setNurseries] = useState<NurseryCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchNurseries();
    }, []);

    const fetchNurseries = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await nurseryService.getAll({ limit: 12 });
            
            if (response.success && response.data) {
                // Get first 3 nurseries or all available
                const displayNurseries = response.data.data.slice(0, 3).map(nursery => ({
                    id: nursery.id,
                    name: nursery.name,
                    slug: nursery.slug,
                    cardImage: nursery.cardImage || '/images/nursery-placeholder.png',
                    reviewCount: nursery.reviewCount || 0,
                    description: nursery.description,
                    groupId: nursery.groupId,
                    group: nursery.group,
                }));
                setNurseries(displayNurseries);
            }
        } catch (err) {
            console.error('Error fetching nurseries:', err);
            setError('Failed to load nurseries');
            // Fallback to at least show some data
            setNurseries([]);
        } finally {
            setLoading(false);
        }
    };

    // Fallback data if API fails
    const fallbackNurseries: NurseryCardData[] = [
        {
            id: '1',
            name: 'Bright Horizons Early Learning',
            slug: 'bright-horizons',
            cardImage: '/images/nursery-1.png',
            reviewCount: 45,
            description: 'Award-winning early years centre helping children grow with confidence.',
            group: { name: 'Bright Horizons', slug: 'bright-horizons' },
        },
        {
            id: '2',
            name: 'Little Steps Nursery',
            slug: 'little-steps',
            cardImage: '/images/nursery-2.png',
            reviewCount: 38,
            description: 'A warm, nurturing nursery offering early learning and creative play.',
            group: { name: 'Little Steps', slug: 'little-steps' },
        },
        {
            id: '3',
            name: 'Happy Tots Daycare',
            slug: 'happy-tots',
            cardImage: '/images/nursery-3.png',
            reviewCount: 52,
            description: 'Safe, stimulating and family-focused childcare loved by parents.',
            group: { name: 'Happy Tots', slug: 'happy-tots' },
        },
    ];

    const displayNurseries = nurseries.length > 0 ? nurseries : (loading ? [] : fallbackNurseries);

    const renderStars = (count: number = 5) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ));
    };

    return (
        <div className="py-16 relative bg-white">
            <div>
                <div className='text-center'>
                    <p className="text-primary font-medium font-heading text-2xl">Featured Nurseries</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                        Join today and register as one of our top<span className="text-secondary px-4 max-w-7xl">nurseries</span>
                    </h2>
                    <p className='text-[16px] font-ubuntu mb-9'>Nurturing spaces where little ones grow and glow</p>
                </div>

                <div className='mx-auto px-24 max-sm:px-10 max-lg:px-36'>
                    {loading ? (
                        <div className="flex justify-center items-center h-80">
                            <p className="text-muted-foreground">Loading nurseries...</p>
                        </div>
                    ) : error && nurseries.length === 0 ? (
                        <div className="flex justify-center items-center h-80">
                            <div className="text-center">
                                <p className="text-muted-foreground mb-4">{error}</p>
                                <p className="text-sm text-gray-500">Showing featured nurseries instead</p>
                            </div>
                        </div>
                    ) : displayNurseries.length > 0 ? (
                        <div className="grid grid-cols-3 max-lg:grid-cols-1 max-lg:gap-40 max-sm:gap-44 gap-6">
                            {displayNurseries.map((nursery) => (
                                <div
                                    key={nursery.id}
                                    className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80"
                                >
                                    <img 
                                        src={nursery.cardImage || '/images/nursery-placeholder.png'} 
                                        alt={nursery.name} 
                                        className="w-full h-full object-cover rounded-xl" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/images/nursery-placeholder.png';
                                        }}
                                    />
                                    <div className="absolute top-60 left-0 right-0 px-4 py-6 mx-4 shadow-lg bg-white rounded-lg">
                                        <h3 className="font-heading text-[24px] font-medium text-[#044A55]">{nursery.name}</h3>
                                        <div className="flex items-center gap-1 mb-2 mt-1">
                                            {renderStars(5)}
                                            <span className="text-sm ml-2 text-foreground">
                                                {nursery.reviewCount || 0} reviews
                                            </span>
                                        </div>
                                        <p className="font-ubuntu text-[14px] text-muted-foreground">
                                            {nursery.description || 'High-quality childcare and early learning'}
                                        </p>
                                        <div className='mt-4 flex items-center gap-2 pt-2'>
                                            <Link 
                                                href={`/products/${nursery.slug}`} 
                                                className='text-secondary font-heading text-[20px] uppercase hover:underline'
                                            >
                                                view all nurseries
                                            </Link>
                                            <ArrowRight className='text-secondary size-5' />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-80">
                            <p className="text-muted-foreground">No nurseries available at the moment</p>
                        </div>
                    )}
                </div>
            </div>

            <div className='flex justify-center items-center mt-44'>
                <Link href="/nursery-group">
                    <Button className="mt-2 bg-primary hover:bg-transparent hover:text-primary border-2 transition-all duration-300 cursor-pointer border-primary text-white rounded-[6px] px-10 py-6">
                        Search All Groups
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default NurseryCardsSection;