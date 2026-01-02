import React from 'react'

const FeaturesSection = () => {
    const features = [
        {
            icon: '/images/feature-3.png',
            title: (
                <>
                    UK's Most Comprehensive <span className="text-secondary">Nursery</span> Directory
                </>
            ),
            description: 'Find trusted nurseries nationwide.'
        },
        {
            icon: '/images/feature-1.png',
            title: (
                <>
                    Most Reliable Source of <span className="text-secondary">Information</span>
                </>
            ),
            description: 'Verified listings you can trust.'
        },
        {
            icon: '/images/feature-2.png',
            title: (
                <>
                    Helping Nurseries <span className="text-secondary">Grow</span>
                </>
            ),
            description: 'Boost visibility with verified reviews.'
        }
    ]

    return (
        <section className="w-full py-6 px-24 max-sm:px-12 max-lg:px-16 lg:px-12 max-xl:px-16 xl:px-24 max-lg:mt-14 ">
            <div className="max-w-[100%] mx-auto">
                <div className="flex  max-sm:flex-col max-lg:flex-col max-lg:items-start  justify-between items-center gap-8">
                    {features.map((feature, index) => {
                        return (
                            <div key={index} className="flex flex-col gap-4 flex-1">
                                <div className="flex max-sm:flex-col max-lg:flex-col max-lg:items-start items-center gap-12">
                                  
                                        <img src={feature.icon} alt="" className="w-20 h-20" />
                                    
                                    <div className='flex-col'>

                                        <h3 className="text-[23px] max-lg:text-[50px] max-sm:text-[25px] font-heading font-bold text-gray-800">
                                            {feature.title}
                                        </h3>
                                    <p className="text-gray-600 max-lg:text-[40px] max-sm:text-[25px] text-base leading-relaxed">
                                        {feature.description}
                                    </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export default FeaturesSection
