'use client';

import React from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';

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
          <div className="bg-white rounded-full shadow-lg p-2 flex gap-2 w-fit flex-wrap">
            
            <select className="px-4 py-3 bg-transparent border-none outline-none text-gray-700 font-medium">
              <option value="">Select Type</option>
              <option value="daycare">Daycare</option>
              <option value="preschool">Preschool</option>
              <option value="nursery">Nursery</option>
            </select>

            <div className="h-8 w-px bg-gray-300"></div>

            <input
              type="text"
              placeholder="Enter your location"
              className="px-4 py-3 bg-transparent border-none outline-none text-gray-700 placeholder:text-gray-400 w-64 max-sm:w-full max-md:w-full"
            />

            <button className="bg-secondary hover:bg-secondary/90 text-white rounded-full p-3 transition-colors">
              <Search className="w-5 h-5" />
            </button>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutBanner;
