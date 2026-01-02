
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AboutUsSection = () => {
    return (
        <section className="w-full py-16 px-24 max-sm:px-10 lg:px-10 xl:px-24 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex max-lg:flex-col gap-12 items-center">
                    {/* Left side - Image */}
                    <div className="flex-1">
                        <img
                            src="/images/about.png"
                            alt="About Us"
                            className="w-full h-full object-cover rounded-md"
                        />
                    </div>

                    {/* Right side - Content */}
                    <div className="flex-1 space-y-6">
                        {/* Sub tag */}
                        <p className="text-primary font-medium font-heading text-2xl">ABOUT US</p>

                        {/* Heading */}
                        <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-800 leading-tight">
                            Where Little Dreams <span className="text-secondary">Grow</span>
                        </h2>

                        {/* Paragraph */}
                        <p className="text-gray-600 text-lg leading-relaxed">
                        At My Nursery, we believe every child deserves a safe, joyful, and inspiring start in life. That’s why we’ve created this website with the ambition to become the UK’s leading platform for connecting families with trusted nurseries and childcare providers.

For parents, this is the first place to go when searching for the perfect nursery placement, a one‑stop destination to discover nurturing environments tailored to your little one’s needs.

For nurseries and nursery groups, it’s the best location to advertise your services, reach more local families, and showcase the passion and care that makes your setting unique.

Whether you’re a parent ready to find the right fit, or a nursery looking to grow your community, My Nursery brings everyone together with confidence, warmth, and a smile.
                        </p>

                        {/* Read More Button */}
                        <div className="flex items-center gap-4">

                            <Button className="bg-primary hover:bg-primary/90 text-white rounded-[6px] px-10 py-6">
                                Read More
                            </Button>

                            {/* Phone section */}
                            <div className="flex items-center gap-3 ">
                                    <Phone className="w-6 h-6 text-[]" />
                                <span className="text-foreground font-medium text-[18px]  font-sans  font-normal">+1 (555) 123-4567</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AboutUsSection