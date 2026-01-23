'use client';

import React from 'react';
import Image from 'next/image';
import BannerSearch from '../sharedComponents/banner-search';

const AboutBanner = () => {
  return (
    <section className="relative w-full h-[500px] flex justify-center overflow-hidden">
      
      {/* Banner Image */}
      <Image
        src="/images/about-banner.png"
        alt="About Banner"
        fill
        priority
        className="object-cover"
      />

      {/* Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">

          {/* Cloud Image */}
          <Image
            src="/images/cloud.png"
            alt="Cloud"
            width={120}
            height={64}
            className="absolute -top-6 left-[150px]"
          />

          {/* Tag Heading */}
          <p className="text-primary font-medium font-heading text-2xl">
            ABOUT US
          </p>

          {/* Heading */}
          <h2 className="text-[66px] max-sm:text-[39px] font-heading font-medium text-white leading-tight">
            Helping Families Find the <br />
            Perfect <span className="text-secondary">Nursery</span>
          </h2>

          {/* Paragraph */}
          <p className="text-white text-lg leading-relaxed max-w-6xl">
            Trusted directory connecting families with the best childcare
            providers across the UK.
          </p>

          {/* Search Box */}
          <BannerSearch />
        </div>
      </div>
    </section>
  );
};

export default AboutBanner;
