'use client';

import React, { useRef } from 'react';
import { Star } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

const features = [
    {
        title: 'UK\'s most comprehensive  <span class="text-secondary">nursery</span> directory ',
        icon: '/images/icon-1.png',
        rating: 4.5,
        description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of content here, making it look like readable English.',
    },
    {
        title: 'Most reliable source of <span class="text-secondary">information</span> available',
        icon: '/images/circle-3.png',
        rating: 4.5,
        description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of content here, making it look like readable English.',
    },
    {
        title: 'Nursery reviews trusted by  <span class="text-secondary">parents</span>',
        icon: '/images/circle-4.png',
        rating: 4.5,
        description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of content here, making it look like readable English.',
    },
];

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
                    <p className="text-primary font-medium font-heading text-2xl">Reviews & Awards</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                       Nursery Reviews & <span className="text-secondary">Awards</span>
                    </h2>
                    <p className='text-[16px] font-ubuntu mb-9 px-12'>At My Nursery, we celebrate excellence in early years care.</p>
                </motion.div>
                <div className='mx-auto px-32 max-2xl:px-6 max-sm:px-8 max-lg:px-36'>
                    <div className="grid grid-cols-3 max-lg:grid-cols-1 max-lg:gap-10 max-sm:gap-10 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="bg-white border border-black/50 rounded-md  transition-shadow duration-300 overflow-hidden p-6"
                                initial={{ opacity: 0, y: 50 }}
                                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                                transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
                                whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-heading text-[24px]  font-medium text-foreground" dangerouslySetInnerHTML={{ __html: feature.title }} />
                                    <img src={feature.icon} alt="icon" className="w-14 h-auto object-cover" />
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                    <span className="text-sm ml-2 text-foreground">{feature.rating}/5</span>
                                </div>
                                <p className="font-ubuntu text-[14px] text-muted-foreground">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeaturesCardsSection;