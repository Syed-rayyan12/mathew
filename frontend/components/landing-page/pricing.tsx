"use client";

import { Check, X } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

const pricingPlans = [
    {
        id: "free",
        title: "Free Listing",
        subtitle: "Start your journey at no cost",
        price: "0",
        features: [
            "Nursery Name",
            "Address",
            "Telephone",
            "Photo Gallery",
            "Staff Profiles",
            "Nursery Updates / News",
            "Featured placement",
            "Analytics dashboard",
        ],
        buttonText: "Get Started",
        buttonClasses: "bg-transparent border-secondary py-4 px-6",
    },

    {
        id: "standard",
        title: "Nursery Listing (Paid)",
        subtitle: "Perfect for growing businesses",
        price: "29",
        features: [
            "Everything in Free",
            "Up to 20 photos",
            "Priority in search results",
            "Enhanced profile design",
            "Response time badge",
            "Featured placement",
            "Promotion boosts",
            "Analytics dashboard",
        ],
        buttonText: "Start Standard",
        buttonClasses: "bg-transparent border-secondary py-4 px-6",
        popular: true,
    },

    {
        id: "premium",
        title: "Group Listing (Paid – MultiNursery)",
        subtitle: "Best for maximum visibility",
        price: "59",
        features: [
            "Everything in Standard",
            "Featured on homepage",
            "Unlimited photos",
            "Promotion boosts",
            "Advanced analytics",
            "Priority support",
            "Custom profile URL",
            "Social media integration",
        ],
        buttonText: "Start Premium",
        buttonClasses: "bg-transparent border-secondary py-4 px-6",
    },
];

export default function PricingSection() {
    const renderPricingCard = (plan: typeof pricingPlans[0]) => (
        <div
            key={plan.id}
            className={`
                relative rounded-2xl p-8 border transition-all
                
                ${plan.id === "standard"
                    ? "border-secondary shadow-xl md:scale-[1.05]"
                    : "border-gray-300 order-1 md:order-none"
                }
              `}
        >
            {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                    MOST POPULAR
                </span>
            )}

            <h3
                className={`text-2xl font-bold ${plan.popular ? "text-secondary" : ""
                    }`}
            >
                {plan.title}
            </h3>

            <p className="text-gray-500 mt-1">{plan.subtitle}</p>

            <p className="text-4xl font-bold mt-6">
                ${plan.price}
                <span className="text-base font-medium text-gray-500">/mo</span>
            </p>

            <ul className="mt-6 space-y-4">
                {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary mt-1" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                className={`mt-8 w-full border rounded-xl font-semibold ${plan.buttonClasses}`}
            >
                {plan.buttonText}
            </button>
        </div>
    );

    return (
        <section className="py-20 bg-white">
            <div className="mx-auto px-24 max-sm:px-4 max-md:px-8 max-lg:px-8">
                {/* Mobile/Tablet Carousel - Hidden on md and above */}
                <div className="lg:hidden">
                    <Carousel
                        opts={{
                            align: "center",
                            loop: true,
                            slidesToScroll: 1,
                        }}
                        className="w-full"
                    >
                        <CarouselContent>
                            {pricingPlans.map((plan) => (
                                <CarouselItem key={plan.id} className="px-5">
                                    {renderPricingCard(plan)}
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-0" />
                        <CarouselNext className="right-0" />
                    </Carousel>
                </div>

                {/* Desktop Grid - Hidden below md */}
                <div className="hidden lg:grid md:grid-cols-3 gap-10">
                    {pricingPlans.map((plan) => renderPricingCard(plan))}
                </div>

                <div className="pt-30 pb-30">

                    <div className="bg-white shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] rounded-2xl p-4 overflow-x-auto">


                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-left bg-gray-100 rounded-xl">
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-l-xl">Features</th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary ">Free</th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary ">
                                        Nursery Listing (Paid)
                                    </th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-r-xl">Group Listing (Paid – Multi Nursery)</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {/* -------- Profile & Visibility -------- */}
                                {/* <tr className="">
                                  
                                    <td></td><td></td><td></td>
                                </tr> */}

                                <tr>
                                    <td className="p-4">Nursery Name</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Address</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Telephone</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Photo Gallery</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Staff Profiles</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                {/* -------- Photos & Media -------- */}


                                <tr>
                                    <td className="p-4">Nursery Updates / News</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Job Vacancies</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Qualifications Display</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Facilities Breakdown</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Client Reviews & Testimonials</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Opening Times</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Location Listing / Map</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>



                                <tr>
                                    <td className="p-4">About Us Section</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Fee Structure Display</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>


                                <tr>
                                    <td className="p-4">Multiple Nursery Accounts</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>

                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                    <tr>
                                    <td className="p-4">Centralised Group Management</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>

                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                    <tr>
                                    <td className="p-4">Group Level</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>

                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>















                            </tbody>
                        </table>
                    </div>


                </div>
            </div>
        </section>
    );
}
