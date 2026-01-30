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
                    <h2 className="text-[66px] font-heading font-medium text-white leading-tight">
                        PRIVACY <span className="text-secondary">POLICY</span>
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        we respect your privacy and are committed to protecting your personal information.<br />
                        This policy explains how we collect, use, and store your data.
                    </p>


                    {/* Search Box */}

                </div>
            </div>
        </section>
    )
}

export default TermsAndConditions;