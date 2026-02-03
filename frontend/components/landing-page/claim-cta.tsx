import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ClaimCTA = () => {
  return (
    <section className="relative w-full h-[400px] mb-30 md:h-[500px] lg:h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/cta.jpeg"
          alt="Call to Action Background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center text-center text-white">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-heading">
          Ready to Claim Your Nursery?
        </h2>
        <p className="text-lg md:text-xl mb-8 max-w-2xl font-sans">
          Take control of your nursery profile and connect with parents looking for quality childcare.
        </p>
        <Link
            href="/nursery-signup"
          className="bg-secondary hover:bg-secondary/90 text-white px-8 py-3 text-lg rounded-sm"
        >
          Start Your Claim Now
        </Link>
      </div>
    </section>
  );
};

export default ClaimCTA;
