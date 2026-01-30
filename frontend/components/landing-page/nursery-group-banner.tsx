import React from 'react'
import BannerSearch from '../sharedComponents/banner-search'

const NurseryGroupBanner = () => {
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
                <div className="relative w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Heading */}
                    <h2 className="text-[66px] max-sm:text-[45px] font-heading font-medium text-white leading-tight">
                        Find the Perfect <span className="text-secondary">Nursery</span><br /> for Your Child
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed max-w-6xl">
                        Search trusted nurseries in your area
                    </p>


                    {/* Search Box */}
                    <BannerSearch />
                </div>
            </div>
        </section>
    )
}

export default NurseryGroupBanner;