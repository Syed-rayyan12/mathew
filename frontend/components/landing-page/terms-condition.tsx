import React from 'react'
import { Search } from 'lucide-react'

const TermsAndConditions = () => {
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
                    <h2 className="text-[66px] max-sm:text-[42px] font-heading font-medium text-white leading-tight">
                        Terms <span className="text-secondary">&</span> Conditions
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Please read these terms carefully before using our website.
                    </p>


                    {/* Search Box */}

                </div>
            </div>
        </section>
    )
}

export default TermsAndConditions;