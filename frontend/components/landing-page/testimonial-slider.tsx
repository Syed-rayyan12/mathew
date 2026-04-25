"use client"

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Star, Quote } from "lucide-react"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import { motion, useInView } from "framer-motion"

const testimonials = [
  {
    id: 1,
    image: "/images/person-1.png",
    name: "John Doe",
    subName: "Bristol",
    text: "The daily updates, photos, and activities are amazing. We always know what our little one has been up to",
    rating: 5,
    background: "/images/tesimonial-2.png"
  },
  {
    id: 2,
    image: "/images/person-2.png",
    name: "Jane Smith",
    subName: "Bristol",
    text: "My daughter has learned so much since joining! The staff treat every child as an individual and really care.",
    rating: 5,
    background: "/images/tesimonial-1.png"
  },
  {
    id: 3,
    image: "/images/person-3.png",
    name: "Sarah Williams",
    subName: "London",
    text: "Absolutely wonderful nursery. The team is so dedicated and our child has blossomed since starting here.",
    rating: 5,
    background: "/images/tesimonial-2.png"
  },
  {
    id: 4,
    image: "/images/person-1.png",
    name: "James Brown",
    subName: "Manchester",
    text: "We are so happy with the care our little one receives. Highly recommend to any parent.",
    rating: 5,
    background: "/images/tesimonial-1.png"
  },
  {
    id: 5,
    image: "/images/person-2.png",
    name: "Emily Davis",
    subName: "Leeds",
    text: "The staff are incredibly caring and professional. Our daughter loves going every day.",
    rating: 5,
    background: "/images/tesimonial-2.png"
  },
  {
    id: 6,
    image: "/images/person-3.png",
    name: "Oliver Wilson",
    subName: "Birmingham",
    text: "From the moment we visited, the team made us feel at ease. My son settled in quickly.",
    rating: 5,
    background: "/images/tesimonial-1.png"
  },
  {
    id: 7,
    image: "/images/person-1.png",
    name: "Sophie Taylor",
    subName: "Bristol",
    text: "A truly nurturing environment. Our child has grown so much in confidence since joining.",
    rating: 5,
    background: "/images/tesimonial-2.png"
  },
  {
    id: 8,
    image: "/images/person-2.png",
    name: "Daniel Moore",
    subName: "Liverpool",
    text: "Outstanding childcare. The activities are engaging and the staff genuinely care about every child.",
    rating: 5,
    background: "/images/tesimonial-1.png"
  },
]

const SLIDES_PER_VIEW = 4;
const totalPages = Math.ceil(testimonials.length / SLIDES_PER_VIEW);

export default function TestimonialSlider() {
  const [api, setApi] = useState<CarouselApi>()
  const [currentPage, setCurrentPage] = useState(0)
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  useEffect(() => {
    if (!api) return
    const onSelect = () => {
      const snap = api.selectedScrollSnap();
      setCurrentPage(Math.floor(snap / SLIDES_PER_VIEW));
    };
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api])

  const scrollToPage = (page: number) => {
    api?.scrollTo(page * SLIDES_PER_VIEW);
  };

  return (
    <section className="py-16 bg-white" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div 
          className='text-center'
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-primary font-medium font-heading text-[30px]">Testimonials</p>
          <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
            Our Recent <span className="text-secondary">Reviews</span>
          </h2>
          <p className='text-[16px] font-ubuntu  mb-9'>See what parents and families say about us </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
        <Carousel
          setApi={setApi}
          className="w-full mx-auto"
          opts={{ align: "start", slidesToScroll: SLIDES_PER_VIEW }}
        >
          <CarouselContent>
            {testimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="basis-1/2 md:basis-1/4">
                <div
                  className="relative px-6 max-lg:px-12 py-14 rounded-lg min-h-[400px] w-full flex flex-col items-center"
                  style={{
                    backgroundImage: `url(${testimonial.background})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <Quote className="absolute bottom-26 right-8 w-12 h-12 text-[#044A55] fill-[#044A55]" />
                  <div className="relative z-10">
                    <div className="flex gap-4">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={100}
                        height={100}
                        className="w-16 h-16 rounded-full mb-4 object-cover"
                      />
                      <div className="flex flex-col pt-1">
                        <h3 className="text-xl font-medium font-heading text-foreground mb-2">{testimonial.name}</h3>
                        <span className="text-primary font-sans text-sm">{testimonial.subName}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm font-sans mb-4 leading-relaxed max-w-md mx-auto">
                      {testimonial.text}
                    </p>
                    <div className="flex">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        </motion.div>
        {/* 2 dots — one per page of 4 */}
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToPage(index)}
              className={`w-3 h-3 rounded-full cursor-pointer transition-colors ${
                currentPage === index ? 'bg-primary' : 'bg-gray-300'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}


