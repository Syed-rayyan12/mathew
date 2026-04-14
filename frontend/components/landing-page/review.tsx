'use client';

import React, { useState, useEffect, useRef } from 'react'
import { Search, Check, MapPin, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
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
    town?: string;
    cardImage?: string;
    group?: {
      name: string;
      slug: string;
    };
  }>;
}

const Review = () => {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (searchType === 'group') {
      router.push(`/nursery-group?city=${encodeURIComponent(selectedCity)}&search=${encodeURIComponent(searchQuery)}&type=group`);
    } else {
      router.push(`/products?city=${encodeURIComponent(selectedCity)}&search=${encodeURIComponent(searchQuery)}&type=nursery`);
    }
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSearchQuery(city);
    setOpen(false);
  };

  const handleSelectGroup = (group: { slug: string; city: string }) => {
    setOpen(false);
    router.push(`/nursery-group/${group.slug}`);
  };

  const handleSelectNursery = (nursery: { slug: string; group?: { slug: string } }) => {
    setOpen(false);
    router.push(`/products/${nursery.slug}`);
  };

  return (
    <section className="w-full h-[600px] relative flex justify-center"
      style={{
        backgroundImage: "url('/images/all-banners.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bottom-[70px] flex items-center justify-center">
        <div className="w-full px-24 max-sm:px-4 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
          {/* Heading */}
          <h2 className="text-[55px] md:text-5xl max-sm:text-[45px] font-heading font-bold text-white leading-tight">
            Real Reviews from Real Parents
          </h2>

          {/* Paragraph */}
          <p className="text-white text-lg leading-relaxed">
            Read genuine, verified experiences to help you choose the right nursery.
          </p>

          {/* Search Box */}
         
        </div>
      </div>
    </section>
  )
}

export default Review;