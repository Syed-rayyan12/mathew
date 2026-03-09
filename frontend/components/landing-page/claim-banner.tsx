import React from 'react'
import BannerSearch from '../sharedComponents/banner-search'

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
            <div className="absolute bottom-[70px] inset-0 flex items-center justify-center">
                <div className=" w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Heading */}
                    <h2 className="text-[55px] md:text-5xl max-sm:text-[45px] font-heading font-bold text-white leading-tight">
                        Claim Your 6-Month Free Nursery Listing
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Learn Boost your visibility and reach more parents — no cost, no commitment.
                    </p>


                    {/* Search Box */}
                    <BannerSearch />
                </div>
            </div>
        </section>
    )
}

export default ClaimBanner;