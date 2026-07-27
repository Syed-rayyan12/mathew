import React from 'react'

const ChildcareBanner = () => {
    return (
        <section className="w-full h-[600px] relative flex justify-center"
            style={{
                backgroundImage: "url('/images/all-banners.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 bottom-[70px] flex max-sm:py-16 py-16 items-center justify-center">
                <div className=" w-full px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 flex flex-col gap-4">
                    {/* Heading */}
                    <h2 className="text-[55px] max-sm:text-[45px] md:text-5xl font-heading font-bold text-white leading-tight">
                        Help With Childcare Costs
                    </h2>

                    {/* Paragraph */}
                    <p className="text-white text-lg leading-relaxed">
                        Learn about government funding, tax-free childcare, and financial<br /> support options tomake childcare more affordable for your family.
                    </p>

                    <a
                        href="https://www.gov.uk/sign-in-childcare-account"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-fit bg-primary hover:bg-transparent hover:text-primary border-2 border-primary text-white font-medium rounded-[6px] px-10 py-4 transition-all duration-300 cursor-pointer"
                    >
                        Sign in to your childcare account
                    </a>

                </div>
            </div>
        </section>
    )  
}

export default ChildcareBanner;