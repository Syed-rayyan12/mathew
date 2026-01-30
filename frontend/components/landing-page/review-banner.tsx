import React from 'react'
import BannerSearch from '../sharedComponents/banner-search'

const ReviewBanner = () => {
    return (
        <section className="w-full h-[500px] relative flex justify-center"
            style={{
                backgroundImage: "url('/images/four.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Tag Heading */}
                    <img src="/images/cloud.png" className=' h-16 object-cover absolute -top-16 left-136 max-md:left-50' alt="" />

                    {/* Heading */}
                    <h2 className="text-[66px] max-sm:text-[45px] font-heading font-medium text-white leading-tight">
                        Share Your <span className="text-secondary">Experience</span>
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Help other parents by sharing your honest review
                    </p>


                    {/* Search Box */}
                    <BannerSearch />
                </div>
            </div>
        </section>
    )
}

export default ReviewBanner;