'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const CircleGridSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    const circles = [
        '/images/men-1.png',
        '/images/circle-2.png',
        '/images/circle-0.png',
        '/images/circle-4.png',
        '/images/circle-1.png',
        '/images/circle-2.png',
    ];

    return (
        <div className='' ref={ref}>
        <div className=" " style={{ backgroundImage: 'url(/images/Vector%207.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="px-24 py-16 max-sm:px-9">
                <div className="grid grid-cols-6 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-2">
                    {circles.map((circle, index) => (
                        <motion.div 
                            key={index} 
                            className="flex justify-center"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                            <img src={circle} alt={`Circle ${index + 1}`} className="w-44  object-contain rounded-full" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
        </div>
    );
};

export default CircleGridSection;