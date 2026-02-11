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
            Choosing the right nursery is one of the biggest decisions a family / parent will ever make yet for years, parents have had to sift through scattered information, outdated listings, and reviews they couldn’t rely on. We knew there had to be a better way.
            Launched in February 2026, our platform has been built with a clear mission: to bring trust, transparency, and clarity to childcare discovery and to become the link between families and the childcare providers who support them.
            What started as a simple idea to help local parents has grown into a nationwide directory. Today, we connect families with nurseries across the UK through verified reviews, detailed profiles, and tools that make the search process calmer, quicker, and more informed.
            And as we grow, we’re using our 25 years of software delivery experience to help bridge the gap between childcare providers and families creating a trusted, modern platform that works for both sides.
            Our aim is bold but simple: to become the UK’s leading child nursery directory, giving parents confidence in their choices and giving nurseries a place to showcase the quality of care they provide.
            At the heart of everything we build is one belief: every child deserves the best start, and every parent deserves a platform they can trust to help them find it.
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