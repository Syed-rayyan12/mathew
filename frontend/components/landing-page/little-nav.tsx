'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Facebook, Instagram, Youtube, Linkedin, Search } from "lucide-react";

export default function MiniNav() {
  const [jobSearch, setJobSearch] = useState('');
  const router = useRouter();

  const handleJobSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = jobSearch.trim();
    router.push(q ? `/jobs?search=${encodeURIComponent(q)}` : '/jobs');
  };

  return (
    <div className="w-full h-12 border-b bg-[#04B0D6] dark:bg-gray-900 flex items-center justify-between px-24 xl:px-24 lg:px-12 max-lg:px-10 text-sm">
      
      {/* LEFT ICONS */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Facebook size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Linkedin size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Instagram size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Youtube size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
      </div>

      {/* RIGHT — Job Search */}
      <form onSubmit={handleJobSearch} className="hidden sm:flex items-center bg-white/20 hover:bg-white/30 transition rounded-full overflow-hidden pl-3 pr-1 py-1 gap-1">
        <input
          type="text"
          value={jobSearch}
          onChange={e => setJobSearch(e.target.value)}
          placeholder="Search jobs..."
          className="bg-transparent text-white placeholder-white/80 text-sm outline-none w-32 focus:w-44 transition-all duration-300"
        />
        <button type="submit" className="bg-white/20 hover:bg-white/40 transition rounded-full p-1.5">
          <Search size={14} className="text-white" />
        </button>
      </form>
    </div>
  );
}
