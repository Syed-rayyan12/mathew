import React from 'react'

const WhatWeDo = () => {
  const services = [
    {
      icon: '/images/do-1.png',
      title: 'Nursery Discovery',
      description: 'Finding the right nursery shouldn’t be overwhelming. Our platform lets parents explore thousands of settings with simple, intuitive filters for location, fees, opening times, availability, curriculum, and more. Whether you’re searching locally or planning ahead, we make it easy to compare nurseries sidebyside and discover the options that truly fit your family’s needs.'
    },
    {
      icon: '/images/do-2.png',
      title: 'Verified Reviews',
      description: 'Every review on our platform is carefully checked before it’s published, ensuring parents see genuine, trustworthy feedback from real families. This helps you make confident decisions based on honest experiences, while giving nurseries fair, constructive insights that reflect the quality of care they provide.'
    },
    {
      icon: '/images/do-3.png',
      title: 'Detailed Profiles',
      description: 'Each nursery has a rich, informative profile designed to give parents a complete picture at a glance. From photos and staff qualifications to facilities, fees, funding options, Ofsted ratings, and curriculum details, everything you need to know is clearly presented in one place  helping you choose with clarity and confidence.'
    },
    {
      icon: '/images/do-4.png',
      title: 'Parent Support',
      description: 'Choosing childcare is a big decision, and we’re here to help every step of the way. Our Parent Support Hub offers practical guides, expert advice, and helpful resources covering funding, settlingin tips, early years development, and more. We empower families with the knowledge they need to make the best choices for their children'
    }
  ]

  return (
    <section className="w-full py-16 max-sm:py-8 bg-white px-24 max-lg:px-8 max-sm:px-4">
      <div className="container mx-auto">
        {/* Heading */}
        <div className="text-center mb-8 max-sm:mb-6">
          <h2 className="text-4xl md:text-5xl max-sm:text-3xl font-heading font-medium text-gray-900 mb-4 max-sm:mb-3">
            WHAT WE <span className="text-secondary">DO</span>
          </h2>
          <p className="text-foreground text-lg max-sm:text-base leading-relaxed max-w-2xl mx-auto">
           Delivering solutions that move your business forward
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-sm:gap-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-lg p-6 max-sm:p-4 text-center border border-gray-200"
            >
              <div className="mb-4 max-sm:mb-3">
                <img
                  src={service.icon}
                  alt={service.title}
                  className=" mx-auto object-cover"
                />
              </div>
              <h3 className="text-xl max-sm:text-lg font-heading font-medium text-[#044A55] mb-3 max-sm:mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground font-sans text-[16px] max-sm:text-sm text-sm line-clamp-5 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhatWeDo