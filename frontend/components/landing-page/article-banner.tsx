import React from 'react'
import BannerSearch from '../sharedComponents/banner-search'

const ArticleBanner = () => {
    return (
        <section className="w-full h-[500px] relative flex justify-center"
            style={{
                backgroundImage: "url('/images/about-banner.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full px-24 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Tag Heading */}

                    <img src="/images/cloud.png" className=' h-16 object-cover absolute -top-18  left-180 max-lg:left-80 max-sm:left-60' alt="" />
                    {/* Heading */}
                    <h2 className="text-[66px] max-sm:text-[45px] font-heading font-medium text-white leading-tight">
                        Advice & Insights for <span className="text-secondary">Parents</span>
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Explore helpful articles on early years, childcare tips, and parenting guidance
                    </p>


                    <BannerSearch />
                </div>
            </div>
        </section>
    )
}

export default ArticleBanner;