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
            "Basic profile page",
            "Reviews enabled",
            "Contact information",
            "Search visibility",
            "Extra photos",
            "Priority in search",
            "Featured placement",
            "Analytics dashboard",
        ],
        buttonText: "Get Started",
        buttonClasses: "bg-transparent border-secondary py-4 px-6",
    },

    {
        id: "standard",
        title: "Standard",
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
        title: "Premium",
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
                                        Standard
                                    </th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-r-xl">Premium</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {/* -------- Profile & Visibility -------- */}
                                <tr className="">
                                    <td className="p-4 font-bold text-gray-700">Profile & Visibility</td>
                                    <td></td><td></td><td></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Basic profile page</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Custom profile URL</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Enhanced profile design</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Featured on homepage</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                {/* -------- Photos & Media -------- */}
                                <tr>
                                    <td className="p-4 font-bold text-foreground font-sans bg-gray-100">Photos & Media</td>
                                    <td  className="bg-gray-100"></td><td className="bg-gray-100"></td><td className="bg-gray-100"></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Up to 5 photos</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Video integration</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                {/* -------- Search & Discovery -------- */}
                                <tr>
                                    <td className="p-4 font-bold text-foreground font-sans bg-gray-100">Search & Discovery</td>
                                    <td  className="bg-gray-100"></td><td className="bg-gray-100"></td><td className="bg-gray-100"></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Appear in search results</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Priority in search</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Featured placement</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Promotion boosts</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                {/* -------- Reviews & Trust -------- */}
                                <tr>
                                    <td className="p-4 font-bold text-foreground font-sans bg-gray-100">Reviews & Trust</td>
                                    <td  className="bg-gray-100"></td><td className="bg-gray-100"></td><td className="bg-gray-100"></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Parent reviews</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Response time badge</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Verified nursery badge</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Testimonial highlights</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                {/* -------- Analytics & Insights -------- */}
                                <tr>
                                    <td className="p-4 font-bold text-foreground font-sans bg-gray-100">Analytics & Insights</td>
                                    <td  className="bg-gray-100"></td><td className="bg-gray-100"></td><td className="bg-gray-100"></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Basic view stats</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Enquiry tracking</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Advanced analytics</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Monthly reports</td>
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
