'use client'

import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export default function MiniNav() {

  return (
    <div className="w-full h-12 border-b  bg-[#04B0D6] dark:bg-gray-900 flex items-center justify-between px-24 xl:px-24 lg:px-12 max-lg:px-10 text-sm">
      
      {/* LEFT ICONS */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
        <Facebook size={18} className="cursor-pointer hover:text-primary transition" />
        </div>
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">

        <Twitter size={18} className="cursor-pointer hover:text-primary transition" />
        </div >
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
        <Instagram size={18} className="cursor-pointer hover:text-primary transition" />
        </div>
        <div className="bg-primary text-white rounded-full p-2 w-8 h-8 flex items-center just">
        <Youtube size={18} className="cursor-pointer hover:text-primary transition" />
        </div>
      </div>
    </div>
  );
}
