import React from 'react'
import { Search } from 'lucide-react'
import Image from 'next/image';

const AboutBanner = () => {
    return (
        <section className="w-full h-[500px] relative flex justify-center"

        >

            <Image
                src="/images/about-banner.png"
                alt="About Banner"
                fill
                priority
                className="object-cover"
            />

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">

                    <img src="/images/cloud.png" className=' h-16 object-cover absolute -top-6 left-150' alt="" />
                    {/* Tag Heading */}
                    <p className="text-primary font-medium font-heading text-2xl">ABOUT US</p>

                    {/* Heading */}
                    <h2 className="text-[66px] max-sm:text-[39px] font-heading font-medium text-white leading-tight">
                        Helping Families Find the<br /> Perfect <span className="text-secondary">Nursery</span>
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed max-w-6xl">
                        Trusted directory connecting families with the best childcare
                        providers across the UK.
                    </p>


                    {/* Search Box */}
                    <div className="bg-white rounded-full shadow-lg p-2 flex gap-2 w-fit">
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
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AboutBanner