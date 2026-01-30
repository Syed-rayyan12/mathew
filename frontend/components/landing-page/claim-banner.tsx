import React from 'react'
import { Search } from 'lucide-react'

const ClaimBanner = () => {
    return (
        <section className="w-full h-[600px] relative flex justify-center"
            style={{
                backgroundImage: "url('/images/all-banners.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                <div className=" w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Heading */}
                    <h2 className="text-4xl md:text-5xl max-sm:text-[45px] font-heading font-bold text-white leading-tight">
                        Claim Your 6-Month Free Nursery Listing
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Learn Boost your visibility and reach more parents — no cost, no commitment.
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

export default ClaimBanner;