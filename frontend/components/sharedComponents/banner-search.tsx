'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const BannerSearch = () => {
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
    <div className="bg-white rounded-full shadow-lg p-2 flex gap-2 w-fit">
      <input
        type="text"
        placeholder="Search city, group or nursery"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyPress}
        className="w-64 max-sm:w-full px-4 py-3 bg-transparent border-none outline-none text-gray-700 font-normal placeholder:text-gray-400"
      />
      <button
        onClick={handleSearch}
        className="bg-secondary hover:bg-secondary/90 text-white rounded-full p-3 transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
};

export default BannerSearch;

