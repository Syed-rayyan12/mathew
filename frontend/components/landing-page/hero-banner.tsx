'use client';

import React, { useState } from 'react'
import { Search, Check, ChevronsUpDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UK_CITIES } from '@/lib/data/uk-cities'
import { toast } from 'sonner'

const heroBanner = () => {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [open, setOpen] = useState(false);

  const handleSearch = () => {
    if (!selectedCity) {
      toast.error('Please select a city');
      return;
    }

    // Navigate to search page with city parameter
    router.push(`/search?city=${encodeURIComponent(selectedCity)}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
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
                 
                 {/* City Dropdown */}
                 {/* <Popover open={open} onOpenChange={setOpen}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="ghost"
                       role="combobox"
                       aria-expanded={open}
                       className={cn(
                         "w-64 max-sm:w-full max-md:w-full justify-between px-4 py-3 h-auto hover:bg-transparent font-normal",
                         !selectedCity && "text-gray-400"
                       )}
                     >
                       {selectedCity || "Select your city"}
                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                     <Command>
                       <CommandInput placeholder="Search city..." />
                       <CommandList>
                         <CommandEmpty>No city found.</CommandEmpty>
                         <CommandGroup>
                           {UK_CITIES.map((city) => (
                             <CommandItem
                               key={city}
                               value={city}
                               onSelect={() => {
                                 setSelectedCity(city);
                                 setOpen(false);
                               }}
                             >
                               <Check
                                 className={cn(
                                   "mr-2 h-4 w-4",
                                   selectedCity === city ? "opacity-100" : "opacity-0"
                                 )}
                               />
                               {city}
                             </CommandItem>
                           ))}
                         </CommandGroup>
                       </CommandList>
                     </Command>
                   </PopoverContent>
                 </Popover> */}
                 
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

export default heroBanner;
