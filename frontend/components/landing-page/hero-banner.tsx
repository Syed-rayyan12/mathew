'use client';

import React from 'react'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'

const heroBanner = () => {
  return (
    <>
        <section className="w-full h-[100vh] max-lg:h-[50vh] max-sm:h-[90vh] lg:h-[50vh] xl:h-[100%] relative flex justify-center"> 
           <motion.img 
             src="/images/hero-banner.png" 
             alt="" 
             className='w-full h-full object-cover background-center'
             initial={{ opacity: 0, scale: 1.1 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1 }}
           />
           
           {/* Content Overlay */}
          <div className="absolute inset-0 flex  pt-30 max-sm:px-8 max-md:px-14  xl:px-24  max-xl:px-16">
             <div className="">
               {/* Heading */}
               <motion.h1 
                 className="text-5xl font-heading font-bold text-white leading-14 mb-4"
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.3 }}
               >
                 Find The Perfect <span className='text-[#044a55]'>Nursery</span> For<br/>  Your <span className='text-[#044a55]'>Little One</span>
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
                 {/* Select Dropdown */}
                 <select className="px-4 py-3 bg-transparent border-none outline-none text-gray-700 font-medium">
                   <option value="">Select Type</option>
                   <option value="daycare">Daycare</option>
                   <option value="preschool">Preschool</option>
                   <option value="nursery">Nursery</option>
                 </select>
                 
                 {/* Divider */}
                 <div className="h-8 w-px bg-gray-300"></div>
                 
                 {/* Location Input */}
                 <input 
                   type="text" 
                   placeholder="Enter your location" 
                   className="px-4 py-3 bg-transparent border-none outline-none text-gray-700 placeholder:text-gray-400 w-64 max-sm:w-full max-md:w-full"
                 />
                 
                 {/* Search Button */}
                 <button className="bg-secondary hover:bg-secondary/90 text-white rounded-full p-3 transition-colors">
                   <Search className="w-5 h-5" />
                 </button>
               </motion.div>
             </div>
           </div>
        </section>
    </>
  )
}

export default heroBanner;
