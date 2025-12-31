'use client';

import React from 'react';

import { Button } from '@/components/ui/button';

const stats = [
    { percent: '65%', text: 'Nurseries Join Today', color: '#3CC1DC' },
    { percent: '', text: 'Join Today', color: '#D0508C' },
    { percent: '', text: 'Multi-Year Discount', color: '#F15F25' },
];

const CTASection = () => {
    return (
        <div className="py-16 px-24 relative bg-white">
            <div className="flex max-lg:flex-col gap-8 items-center">
                <div className="flex-1 text-center lg:text-left">
                     <p className="text-primary font-medium font-heading text-2xl">Sign up today and grow</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                       Join My <span className="text-secondary">Nursery</span> Today
                    </h2>
                    <p className='text-[16px] text-muted-foreground font-sans mb-6'>Connect with local families, build trust through verified reviews, and manage your profile — all from one simple dashboard.</p>
                    <Button className="bg-secondary hover:bg-secondary/80 text-white px-6 rounded-[6px] py-5">
                              Sign Up & Get Started — It's Free!
                    </Button>
                </div>
                <div className="flex-1">
                    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-1">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="rounded-full w-44 h-44 mx-auto flex flex-col items-center justify-center text-center"
                                style={{ backgroundColor: stat.color }}
                            >
                                <span className="text-lg font-medium font-heading text-[48px] text-white">{stat.percent}</span>
                                <span className="text-xl font-heading font-medium text-white">{stat.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
           
        </div>
    );
};

export default CTASection;