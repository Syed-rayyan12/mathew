import React from 'react'
import { Check } from 'lucide-react'

const AboutLeft = () => {
  return (
    <section className="w-full py-16 max-sm:py-8 bg-white px-24 max-lg:px-8 max-sm:px-4">
      <div className="container mx-auto  flex flex-col md:flex-row items-center gap-8 max-sm:gap-6">
        {/* Image */}
        <div className="w-1/2 max-lg:w-full">
          <img
            src="/images/about-left.png"
            alt="About Left"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        {/* Content */}
        <div className="w-1/2 max-lg:w-full">
          {/* Heading */}
          <h2 className="text-4xl md:text-5xl max-sm:text-3xl font-heading font-medium text-gray-900 mb-4 max-sm:mb-3">
            Our <span className="text-secondary">Mission</span>
          </h2>

          {/* Paragraph */}
          <p className="text-foreground font-sans text-[18px] max-sm:text-base leading-relaxed mb-8 max-sm:mb-6">
            We aim to simplify the childcare discovery process by providing clear information, trusted reviews, and verified profiles — helping parents make confident decisions about early years education.
          </p>

          {/* Two Divs with Spans */}
          <div className="flex max-sm:flex-col items-center max-sm:items-start gap-14 max-md:gap-8 max-sm:gap-4">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[18px] max-sm:text-base font-sans font-normal">
                <Check className="w-5 h-5 max-sm:w-4 max-sm:h-4 text-orange-500" />
                Clear Information
              </span>
              <span className="flex items-center gap-2 text-[18px] max-sm:text-base font-sans font-normal">
                <Check className="w-5 h-5 max-sm:w-4 max-sm:h-4 text-orange-500" />
                Trusted Reviews
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[18px] max-sm:text-base font-sans font-normal">
                <Check className="w-5 h-5 max-sm:w-4 max-sm:h-4 text-orange-500" />
                Verified Profiles
              </span>
              <span className="flex items-center gap-2 text-[18px] max-sm:text-base font-sans font-normal">
                <Check className="w-5 h-5 max-sm:w-4 max-sm:h-4 text-orange-500" />
                Confident Decisions
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutLeft