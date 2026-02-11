import React from 'react'
import BannerSearch from '../sharedComponents/banner-search'

const ProductBanner = () => {
    return (
        <section className="w-full h-[600px] relative flex justify-center"
            style={{
                backgroundImage: "url('/images/My-Nursery-Header.jpeg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 flex items-center bottom-[60px] justify-center">
                <div className="relative w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Heading */}
                    <h2 className="text-[55px] max-sm:text-[45px] font-heading font-medium text-white leading-tight">
                        Find the Perfect Nursery<br/> for Your Child
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Search trusted nurseries in your area
                    </p>


                    {/* Search Box */}
                    <BannerSearch />
                </div>
            </div>
        </section>
    )
}

export default ProductBanner;