'use client';

import React, { useRef } from 'react';
import { Star, MessageSquareHeart, BellRing } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

const FeaturesCardsSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <div className="py-16 px-24 max-lg:px-0 relative bg-white" ref={ref}>
            <div>
                <motion.div
                    className='text-center'
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-primary font-medium font-heading text-[30px]">Reviews</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                        Nursery <span className="text-secondary">Reviews</span>
                    </h2>
                    <p className='text-[16px] font-ubuntu mb-9 px-12'>At My Nursery, we celebrate excellence in early years care.</p>
                </motion.div>

                <div className='mx-auto px-32 max-2xl:px-6 max-sm:px-8 max-lg:px-36'>
                    <motion.div
                        className="relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-orange-50 via-white to-cyan-50 px-8 py-16 max-sm:px-6 max-sm:py-12 text-center"
                        initial={{ opacity: 0, y: 50 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        {/* Decorative floating stars */}
                        <Star className="absolute top-8 left-10 w-6 h-6 fill-yellow-300 text-yellow-300 opacity-60 max-sm:hidden" />
                        <Star className="absolute top-16 right-14 w-4 h-4 fill-yellow-300 text-yellow-300 opacity-50 max-sm:hidden" />
                        <Star className="absolute bottom-10 left-24 w-4 h-4 fill-yellow-300 text-yellow-300 opacity-40 max-sm:hidden" />
                        <Star className="absolute bottom-14 right-24 w-6 h-6 fill-yellow-300 text-yellow-300 opacity-60 max-sm:hidden" />

                        <motion.div
                            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md"
                            initial={{ scale: 0 }}
                            animate={isInView ? { scale: 1 } : { scale: 0 }}
                            transition={{ duration: 0.5, delay: 0.4, type: 'spring', stiffness: 200 }}
                        >
                            <MessageSquareHeart className="h-10 w-10 text-primary" />
                        </motion.div>

                        <div className="mb-4 flex items-center justify-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                                    transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                                >
                                    <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
                                </motion.span>
                            ))}
                        </div>

                        <h3 className="font-heading text-3xl md:text-4xl font-medium text-foreground mb-3">
                            Reviews <span className="text-secondary">Coming Soon</span>
                        </h3>
                        <p className="font-ubuntu text-[16px] text-muted-foreground max-w-xl mx-auto">
                            Soon parents will be able to read and share honest reviews of nurseries
                            across the UK — real experiences from real families, all in one place.
                        </p>

                        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-5 py-2.5 shadow-sm">
                            <BellRing className="h-4 w-4 text-primary" />
                            <span className="font-ubuntu text-sm text-foreground">Watch this space — launching soon</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default FeaturesCardsSection;
