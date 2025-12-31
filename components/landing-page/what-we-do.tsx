import React from 'react'

const WhatWeDo = () => {
  const services = [
    {
      icon: '/images/do-1.png',
      title: 'Nursery Discovery',
      description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.'
    },
    {
      icon: '/images/do-2.png',
      title: 'Verified Reviews',
      description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.'
    },
    {
      icon: '/images/do-3.png',
      title: 'Detailed Profiles',
      description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.'
    },
    {
      icon: '/images/do-4.png',
      title: 'Parent Support',
      description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.'
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
                  className="w-12 max-sm:w-10 mx-auto object-cover"
                />
              </div>
              <h3 className="text-xl max-sm:text-lg font-heading font-medium text-[#044A55] mb-3 max-sm:mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground font-sans text-[16px] max-sm:text-sm text-sm leading-relaxed">
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