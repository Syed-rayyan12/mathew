'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const stats = [
    { percent: '', text: 'Join Today', color: '#3CC1DC' },
    { percent: '', text: 'Get first 6 months free', color: '#D0508C' },
    { percent: '', text: 'Multi-Year Discount', color: '#F15F25' },
];

const CTASection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    return (
        <div className="py-16 px-24 relative bg-white" ref={ref}>
            <div className="flex max-lg:flex-col gap-8 items-center">
                <motion.div 
                    className="flex-1 text-center lg:text-left"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.8 }}
                >
                     <p className="text-primary font-medium font-heading text-2xl">Limited Time Offer</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                       Join My Nursery <span className="text-secondary">Platform</span> Today
                    </h2>
                    <p className='text-[16px] text-muted-foreground font-sans mb-8'>Get your first 6 months completely FREE when you sign up.</p>
                    <Link href="/nursery-signup" className="bg-secondary hover:bg-secondary/80 text-white px-6 rounded-[6px] py-4">
                              Sign Up & Get Started — It's Free!
                    </Link >
                </motion.div>
                <motion.div 
                    className="flex-1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-1">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                className="rounded-full w-44 h-44 mx-auto flex flex-col items-center justify-center text-center"
                                style={{ backgroundColor: stat.color }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                                whileHover={{ scale: 1.1 }}
                            >
                                <span className="text-lg font-medium font-heading text-[48px] text-white">{stat.percent}</span>
                                <span className="text-xl font-heading font-medium text-white">{stat.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
           
        </div>
    );
};

export default CTASection;