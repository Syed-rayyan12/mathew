import React from "react";
import Image from "next/image";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        id: 1,
        image: "/images/person-1.png",
        name: "John Doe",
        subName: "Bristol",
        text: "The daily updates, photos, and activities are amazing. We always know what our little one has been up to.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
    {
        id: 2,
        image: "/images/person-2.png",
        name: "Jane Smith",
        subName: "Bristol",
        text: "My daughter has learned so much since joining! The staff treat every child as an individual and really care.",
        rating: 5,
        background: "/images/tesimonial-1.png",
    },
    {
        id: 3,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },

       {
        id: 4,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
       {
        id: 5,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
       {
        id: 6,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
       {
        id: 7,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
       {
        id: 8,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
       {
        id: 9,
        image: "/images/person-3.png",
        name: "Mike Johnson",
        subName: "Bristol",
        text: "From the moment we visited, the team made us feel at ease. My son settled in quickly and now looks forward to every day.",
        rating: 5,
        background: "/images/tesimonial-2.png",
    },
];

const ReviewBlog = () => {
    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
                {/* Heading */}
                {/* GRID CARDS */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {testimonials.map((testimonial) => (
                        <div
                            key={testimonial.id}
                            className="relative px-6 max-sm:px-12 md:px-12 py-14 rounded-lg min-h-[380px] flex flex-col  bg-white "
                            style={{
                                backgroundImage: `url(${testimonial.background})`,
                                backgroundSize: "contain",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                            }}
                        >
                            <Quote className="absolute bottom-24 right-8 max-sm:right-14 w-10 h-10 text-[#044A55] fill-[#044A55]" />

                            {/* Image + Name */}
                            <div className="flex gap-4">
                                <Image
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    width={80}
                                    height={80}
                                    className="w-16 h-16 rounded-full object-cover"
                                />

                                <div className="flex flex-col pt-1">
                                    <h3 className="text-xl font-medium font-heading text-foreground">
                                        {testimonial.name}
                                    </h3>
                                    <span className="text-primary text-sm">{testimonial.subName}</span>
                                </div>
                            </div>

                            {/* Text */}
                            <p className="mt-4 text-gray-600 text-sm  leading-relaxed">
                                {testimonial.text}
                            </p>

                            {/* Rating */}
                            <div className="flex mt-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReviewBlog;
