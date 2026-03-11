'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, LocationEditIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nurseryService } from '@/lib/api/nursery';
import { motion, useInView } from 'framer-motion';

import { Swiper, SwiperSlide } from 'swiper/react';

interface NurseryCardData {
    id: string;
    name: string;
    slug: string;
    cardImage?: string;
    reviewCount: number;
    description?: string;
    city?: string;
    town?: string;
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
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    useEffect(() => {
        fetchNurseries();
    }, []);

    const fetchNurseries = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await nurseryService.getAll({ limit: 12 });

            if (response.success && Array.isArray(response.data)) {
                // Get first 6 nurseries or all available
                const displayNurseries = response.data.slice(0, 6).map(nursery => ({
                    id: nursery.id,
                    name: nursery.name,
                    slug: nursery.slug,
                    cardImage: nursery.cardImage || '/images/nursery-placeholder.png',
                    reviewCount: nursery.reviewCount || 0,
                    description: nursery.description,
                    city: nursery.city || 'Location not specified',
                    town: nursery.town,
                    groupId: nursery.groupId,
                    group: nursery.group,
                }));
                setNurseries(displayNurseries);
            } else {
                console.warn('No nurseries found or invalid response:', response);
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
            city: 'London',
            group: { name: 'Bright Horizons', slug: 'bright-horizons' },
        },
        {
            id: '2',
            name: 'Little Steps Nursery',
            slug: 'little-steps',
            cardImage: '/images/nursery-2.png',
            reviewCount: 38,
            description: 'A warm, nurturing nursery offering early learning and creative play.',
            city: 'Manchester',
            group: { name: 'Little Steps', slug: 'little-steps' },
        },
        {
            id: '3',
            name: 'Happy Tots Daycare',
            slug: 'happy-tots',
            cardImage: '/images/nursery-3.png',
            reviewCount: 52,
            description: 'Safe, stimulating and family-focused childcare loved by parents.',
            city: 'Birmingham',
            group: { name: 'Happy Tots', slug: 'happy-tots' },
        },
        {
            id: '4',
            name: 'Sunshine Kids',
            slug: 'sunshine-kids',
            cardImage: '/images/nursery-4.png',
            reviewCount: 29,
            description: 'Bright and cheerful environment for early learners.',
            city: 'Leeds',
            group: { name: 'Sunshine Kids', slug: 'sunshine-kids' },
        },
        {
            id: '5',
            name: 'Tiny Treasures',
            slug: 'tiny-treasures',
            cardImage: '/images/nursery-5.png',
            reviewCount: 34,
            description: 'A place where every child is a treasure.',
            city: 'Liverpool',
            group: { name: 'Tiny Treasures', slug: 'tiny-treasures' },
        },
        {
            id: '6',
            name: 'Little Explorers',
            slug: 'little-explorers',
            cardImage: '/images/nursery-6.png',
            reviewCount: 41,
            description: 'Encouraging curiosity and adventure in every child.',
            city: 'Bristol',
            group: { name: 'Little Explorers', slug: 'little-explorers' },
        },
    ];

    const displayNurseries = nurseries.length > 0 ? nurseries : (loading ? [] : fallbackNurseries);

    const renderStars = (count: number = 5) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ));
    };

    return (
        <div className="py-16 relative bg-white" ref={ref}>
            <div>
                <motion.div
                    className='text-center'
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-primary font-medium font-heading text-2xl">Featured Nurseries</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                        Join today and register as one of our top <span className="text-secondary max-w-7xl">nurseries</span>
                    </h2>
                    <p className='text-[16px] font-ubuntu mb-9'>Nurturing spaces where little ones grow and glow</p>
                </motion.div>

                {/* Custom navigation arrows */}
                <div className="flex justify-end items-center gap-4 mb-4 px-24 max-sm:px-10 max-lg:px-36">
                    <button className="swiper-button-prev-custom bg-white border-2 border-orange-500 rounded-full p-2 shadow hover:bg-orange-500 group transition-all duration-200" aria-label="Previous">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.5 19L8.5 12L15.5 5" stroke="#FF8800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white"/>
                        </svg>
                    </button>
                    <button className="swiper-button-next-custom bg-white border-2 border-orange-500 rounded-full p-2 shadow hover:bg-orange-500 group transition-all duration-200" aria-label="Next">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.5 5L15.5 12L8.5 19" stroke="#FF8800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white"/>
                        </svg>
                    </button>
                </div>

                <div className='mx-auto px-24 max-sm:px-10 max-lg:px-36'>
                    <Swiper
                        slidesPerView={3}
                        spaceBetween={24}
                        navigation={{
                            nextEl: '.swiper-button-next-custom',
                            prevEl: '.swiper-button-prev-custom',
                        }}
                        pagination={{ clickable: true }}
                        breakpoints={{
                            320: { slidesPerView: 1 },
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }}
                        style={{ paddingBottom: 40 }}
                    >
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
                            <div className="flex justify-center gap-6">
                                {displayNurseries.map((nursery, index) => (
                                    <SwiperSlide key={nursery.id} className="h-auto flex justify-center items-center">
                                        <motion.div
                                            className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80 w-full max-w-[400px]"
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                                            transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
                                            whileHover={{ y: -10 }}
                                        >
                                            <img
                                                src={nursery.cardImage || '/images/nursery-placeholder.png'}
                                                alt={nursery.name}
                                                className="w-full h-full object-cover rounded-xl"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/images/nursery-placeholder.png';
                                                }}
                                            />
                                            <div className="mt-[-160px] left-0 right-0 px-4 py-6 mx-4 shadow-lg bg-white rounded-lg relative">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <h3 className="font-heading text-[24px] font-medium text-[#044A55]">{nursery.name}</h3>
                                                    {(nursery.city || nursery.town) && (
                                                        <span className="text-sm font-ubuntu flex items-center text-foreground whitespace-nowrap">
                                                            <LocationEditIcon className='text-secondary' />
                                                            {[nursery.town, nursery.city].filter(Boolean).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 mb-2">
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
                                                        href="/products"
                                                        className='text-secondary font-heading text-[20px] uppercase hover:underline'
                                                    >
                                                        view all nurseries
                                                    </Link>
                                                    <ArrowRight className='text-secondary size-5' />
                                                </div>
                                            </div>
                                        </motion.div>
                                    </SwiperSlide>
                                ))}
                            </div>
                        ) : (
                            <div className="flex justify-center items-center h-80">
                                <p className="text-muted-foreground">No nurseries available at the moment</p>
                            </div>
                        )}
                    </Swiper>
                </div>
            </div>

            <div className='flex justify-center items-center mt-44'>
                <Link href="/nursery-group">
                    <Button className="mt-2 bg-primary hover:bg-transparent hover:text-primary border-2 transition-all duration-300 cursor-pointer border-primary text-white rounded-[6px] px-10 py-6">
                        View All Nurseries
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default NurseryCardsSection;