'use client';

import React from 'react';

const CircleGridSection = () => {
    const circles = [
        '/images/men-1.png',
        '/images/circle-2.png',
        '/images/circle-0.png',
        '/images/circle-4.png',
        '/images/circle-1.png',
        '/images/circle-2.png',
    ];

    return (
        <div className=''>
        <div className=" " style={{ backgroundImage: 'url(/images/Vector%207.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="px-24 py-16 max-sm:px-9">
                <div className="grid grid-cols-6 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-2">
                    {circles.map((circle, index) => (
                        <div key={index} className="flex justify-center">
                            <img src={circle} alt={`Circle ${index + 1}`} className="w-44  object-contain rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </div>
    );
};

export default CircleGridSection;