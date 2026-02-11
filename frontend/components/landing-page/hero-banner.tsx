'use client';

import React, { useState, useEffect, useRef } from 'react'
import { Search, Check, ChevronsUpDown, MapPin, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UK_CITIES } from '@/lib/data/uk-cities'
import { UK_TOWNS } from '@/lib/data/uk-towns'
import { toast } from 'sonner'
import { nurseryService } from '@/lib/api/nursery'

interface AutocompleteResults {
  cities: string[];
  towns: string[];
  groups: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    cardImage?: string;
  }>;
  nurseries: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    cardImage?: string;
    group?: {
      name: string;
      slug: string;
    };
  }>;
}

const SLIDES = [
  '/images/hero-banner.png',
  '/images/four.png',
  '/images/five.png'
];

const HeroBanner = () => {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'nursery' | 'group'>('nursery');
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResults>({
    cities: [],
    towns: [],
    groups: [],
    nurseries: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsLoading(true);
        try {
          const response = await nurseryService.autocomplete(searchQuery);
          if (response.success && response.data) {
            setAutocompleteResults({
              ...response.data,
              towns: response.data.towns || [],
            });
          }
        } catch (error) {
          console.error('Autocomplete error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Show limited UK cities and towns when no search query
        setAutocompleteResults({
          cities: UK_CITIES.slice(0, 10),
          towns: UK_TOWNS.slice(0, 10),
          groups: [],
          nurseries: [],
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = () => {
    if (!selectedCity) {
      toast.error('Please select a city, group, or nursery');
      return;
    }

    // Navigate to appropriate page based on search type
    if (searchType === 'group') {
      router.push(`/nursery-group?city=${encodeURIComponent(selectedCity)}&search=${encodeURIComponent(searchQuery)}&type=group`);
    } else {
      router.push(`/products?city=${encodeURIComponent(selectedCity)}&search=${encodeURIComponent(searchQuery)}&type=nursery`);
    }
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSearchQuery(city); // Display the selected city in the input
    setOpen(false);
  };

  const handleSelectGroup = (group: { slug: string; city: string }) => {
    setOpen(false);
    router.push(`/nursery-group/${group.slug}`);
  };

  const handleSelectNursery = (nursery: { slug: string; group?: { slug: string } }) => {
    setOpen(false);
    // Navigate to nursery detail page at /products/[slug]
    router.push(`/products/${nursery.slug}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
          <div className="absolute inset-0 flex items-center bottom-[190px]  max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 z-10">
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
                 {/* Select Dropdown for Search Type */}
                 <select 
                   value={searchType}
                   onChange={(e) => setSearchType(e.target.value as 'nursery' | 'group')}
                   className="px-4 py-3 bg-transparent border-none outline-none text-gray-700 font-medium cursor-pointer"
                 >
                   <option value="nursery">Nursery</option>
                   <option value="group">Group</option>
                 </select>
                 
                 {/* Divider */}
                 <div className="h-8 w-px bg-gray-300"></div>
                 
                 {/* Search Input with Dropdown */}
                 <div ref={searchContainerRef} className="relative w-64 max-sm:w-full max-md:w-full">
                   <input
                     type="text"
                     placeholder="Search city, group or nursery"
                     value={searchQuery}
                     onChange={(e) => {
                       setSearchQuery(e.target.value);
                       setOpen(true);
                     }}
                     onFocus={() => setOpen(true)}
                     className="w-full px-4 py-3 bg-transparent border-none outline-none text-gray-700 font-normal placeholder:text-gray-400"
                   />
                   
                   {/* Dropdown Results */}
                   {open && (searchQuery.length > 0 || autocompleteResults.cities.length > 0) && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                       <Command shouldFilter={false}>
                         <CommandList>
                           {isLoading ? (
                             <div className="py-6 text-center text-sm text-gray-500">
                               Loading...
                             </div>
                           ) : (
                             <>
                               {autocompleteResults.cities.length === 0 && 
                                autocompleteResults.towns.length === 0 && 
                                autocompleteResults.groups.length === 0 && 
                                autocompleteResults.nurseries.length === 0 ? (
                                 <CommandEmpty>No results found.</CommandEmpty>
                               ) : (
                                 <>
                                   {/* Cities and Towns in 2 columns */}
                                   {(autocompleteResults.cities.length > 0 || autocompleteResults.towns.length > 0) && (
                                     <div className="grid grid-cols-2 gap-2 p-2">
                                       {/* Cities Column */}
                                       <div className="border-r pr-2">
                                         <CommandGroup heading="Cities">
                                           {autocompleteResults.cities.map((city) => (
                                             <CommandItem
                                               key={`city-${city}`}
                                               value={city}
                                               onSelect={() => handleSelectCity(city)}
                                             >
                                           
                                             <MapPin className="mr-2 h-4 w-4 text-secondary" />
                                             <span>{city}</span>
                                             <Check
                                               className={cn(
                                                 "ml-auto h-4 w-4",
                                                 selectedCity === city ? "opacity-100" : "opacity-0"
                                               )}
                                             />
                                           </CommandItem>
                                         ))}
                                       </CommandGroup>
                                     </div>

                                     {/* Towns Column */}
                                     <div>
                                       <CommandGroup heading="Towns">
                                         {autocompleteResults.towns.map((town) => (
                                           <CommandItem
                                             key={`town-${town}`}
                                             value={town}
                                             onSelect={() => handleSelectCity(town)}
                                           >
                                             <MapPin className="mr-2 h-4 w-4 text-blue-600" />
                                             <span>{town}</span>
                                             <Check
                                               className={cn(
                                                 "ml-auto h-4 w-4",
                                                 selectedCity === town ? "opacity-100" : "opacity-0"
                                               )}
                                             />
                                           </CommandItem>
                                         ))}
                                       </CommandGroup>
                                     </div>
                                   </div>
                                 )}

                                 {/* Groups - Show only if searchType is 'group' */}
                                 {searchType === 'group' && autocompleteResults.groups.length > 0 && (
                                   <CommandGroup heading="Nursery Groups">
                                     {autocompleteResults.groups.map((group) => (
                                       <CommandItem
                                         key={`group-${group.id}`}
                                         value={group.name}
                                         onSelect={() => handleSelectGroup(group)}
                                       >
                                         <Building2 className="mr-2 h-4 w-4 text-secondary" />
                                         <div className="flex flex-col">
                                           <span className="font-medium">{group.name}</span>
                                           <span className="text-xs text-gray-500">{group.city}</span>
                                         </div>
                                       </CommandItem>
                                     ))}
                                   </CommandGroup>
                                 )}

                                 {/* Nurseries - Show only if searchType is 'nursery' */}
                                 {searchType === 'nursery' && autocompleteResults.nurseries.length > 0 && (
                                   <CommandGroup heading="Nurseries">
                                     {autocompleteResults.nurseries.map((nursery) => (
                                       <CommandItem
                                         key={`nursery-${nursery.id}`}
                                         value={nursery.name}
                                         onSelect={() => handleSelectNursery(nursery)}
                                       >
                                         <Building2 className="mr-2 h-4 w-4 text-green-600" />
                                         <div className="flex flex-col">
                                           <span className="font-medium">{nursery.name}</span>
                                           <span className="text-xs text-gray-500">
                                             {nursery.city}
                                             {nursery.group && ` • ${nursery.group.name}`}
                                           </span>
                                         </div>
                                       </CommandItem>
                                     ))}
                                   </CommandGroup>
                                 )}
                               </>
                             )}
                           </>
                         )}
                       </CommandList>
                     </Command>
                   </div>
                   )}
                 </div>
                 
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
