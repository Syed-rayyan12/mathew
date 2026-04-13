'use client';

import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const SLIDES = [
  '/images/hero-banner.png',
  '/images/four.png',
  '/images/five.png'
];

const HeroBanner = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a city, group, or nursery name');
      return;
    }
    router.push(`/products?city=${encodeURIComponent(searchQuery.trim())}&search=${encodeURIComponent(searchQuery.trim())}&type=nursery`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <>
        <section className="w-full h-[100vh] max-lg:h-[60vh] max-sm:h-[90vh] lg:h-[70vh] xl:h-[95vh] relative flex justify-center overflow-hidden"> 
           {/* Background Image */}
           <div className="relative w-full h-full">
             <img 
               src="/images/hero-banner.png"
               alt="Hero Banner"
               className='absolute inset-0 w-full h-full object-cover'
             />
           </div>
           
           {/* Content Overlay */}
          <div className="absolute inset-0 flex items-center bottom-[190px]  max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 z-10 max-w-[1300px]">
             <div className="">
               {/* Heading */}
               <motion.h1 
                 className="text-5xl font-heading font-bold text-white leading-14 mb-4"
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.3 }}
               >
                 Find The Perfect <span className='text-[#044a55]'>Nursery</span> For<br/> Your <span className='text-[#044a55]'>Little One</span>
               </motion.h1>
               
               {/* Description */}
               <motion.p 
                 className="text-lg md:text-xl text-white/90 mb-8"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.5 }}
               >
                 Discover trusted nurseries in your area
               </motion.p>
               
               {/* Search Box */}
               <motion.div 
                 className="bg-white rounded-full shadow-lg p-2 flex gap-2 w-fit"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.7 }}
               >
                 {/* Search Input */}
                 <input
                   type="text"
                   placeholder="Search city, group or nursery"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onKeyDown={handleKeyPress}
                   className="w-64 max-sm:w-full px-4 py-3 bg-transparent border-none outline-none text-gray-700 font-normal placeholder:text-gray-400"
                 />
                 
                 {/* Search Button */}
                 <button 
                   onClick={handleSearch}
                   className="bg-secondary hover:bg-secondary/90 text-white rounded-full p-3 transition-colors"
                 >
                   <Search className="w-5 h-5" />
                 </button>
               </motion.div>
             </div>
           </div>
        </section>
    </>
  )
}

export default HeroBanner;



