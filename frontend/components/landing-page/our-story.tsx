import React from 'react'

const OurStory = () => {
    return (
        <section className="w-full bg-[#F2F4F5] mb-20 max-sm:mb-10">
            <div className="flex max-lg:flex-col item-center">
                {/* Image */}

                <img
                    src="/images/our-story.jpeg"
                    alt="Our Story"
                    className="w-1/2 max-lg:w-full h-auto object-cover"
                />


                {/* Content */}

                {/* Heading */}
                <div className='px-6 max-sm:px-4 py-10 max-sm:py-6'>

                    <h2 className="text-4xl md:text-5xl max-sm:text-3xl font-heading font-medium text-gray-900 mb-4 max-sm:mb-3">
                        Our <span className="text-secondary">Story</span>
                    </h2>

                    {/* Paragraph */}
                    <p className="text-foreground leading-relaxed mb-8 max-sm:mb-6 font-sans text-[18px] max-sm:text-base">
                        Choosing the right nursery is one of the most important decisions a family will ever make — but for years, parents struggled with scattered information, outdated listings, and unreliable reviews. We saw the stress and uncertainty this created and knew there had to be a better way.
                        <br /><br />
                        Our platform was created with a simple mission: to bring transparency, trust, and clarity to childcare discovery.
                        <br /><br />
                        What began as a small idea to help local parents quickly grew into a nationwide childcare directory. Today, we connect families with nurseries across the country, offering verified reviews, detailed profiles, and tools that make the search experience easier, calmer, and more informed.
                        <br /><br />
                        We believe every child deserves a nurturing start, and every parent deserves confidence in their choice. That belief continues to guide everything we build — from smarter search filters to improved nursery profiles and group management tools.
                    </p>
                </div>

            </div>
        </section>
    )
}

export default OurStory