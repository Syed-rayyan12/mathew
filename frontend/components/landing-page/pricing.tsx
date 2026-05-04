"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

const pricingPlans = [
   

    {
        id: "standard",
        title: "Nursery Listing (Paid)",
        subtitle: "Perfect for growing businesses",
        price: "23.90",
        features: [
            "Full Nursery Profile Page",
            "About Us, Philosophy, Fees, Opening Hours",
            "Age Range, Facilities & Services",
            "Card Image + Gallery Images",
            "Appear in City & Search Results",
            "Parent Reviews & Ratings",
            "Review Notifications",
            "Contact Enquiries from Parents",
            "Basic Nursery Dashboard",
            "Standard Search Visibility",
        ],
        buttonText: "Start Standard",
        buttonClasses: "bg-transparent border-secondary py-4 px-6 hover:bg-secondary hover:text-white transition-colors duration-200",
        popular: true,
        priceLabel: " per month per nursery",
    },

    {
        id: "platinum",
        title: "Platinum",
        subtitle: "Best for maximum visibility",
        price: "38.60",
        features: [
            "Unlimited Nursery Locations",
            "Nursery Group Page (for multiple branches)",
            "Unlimited Image Gallery",
            "Video on Nursery Profile",
            "Team Member Profiles (including qualifications & badges)",
            "Review Management (approve, reject, respond)",
            "Full Notification System",
            "Priority Placement in Search Results",
            "Dashboard Analytics (ratings, reviews, performance)",
        ],
        buttonText: "Start Platinum",
        buttonClasses: "bg-transparent border-secondary py-4 px-6 hover:bg-secondary hover:text-white transition-colors duration-200",
        priceLabel: "per month per nursery group",
    },
];

export default function PricingSection() {
    const router = useRouter();
    const [isNurseryOwner, setIsNurseryOwner] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>('');
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

    // Prices: annual = monthly × 12
    const PRICING = {
        standard: { monthly: '23.95', annual: (23.95 * 12).toFixed(2) },
        platinum: { monthly: '38.60', annual: (38.60 * 12).toFixed(2) },
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem('nurseryUser');
            const user = raw ? JSON.parse(raw) : null;
            if (user && user.role === 'NURSERY_OWNER') {
                setIsNurseryOwner(true);
                setCurrentPlan((user.plan || 'standard').toLowerCase());
            }
        } catch { /* not logged in */ }
    }, []);

    // Pricing page buttons always go to nursery-signup (new group).
    // Upgrading an existing account is done from the nursery dashboard only.
    const handlePlanSelect = (planId: string) => {
        router.push(`/nursery-signup?plan=${planId}&billing=${billingPeriod}`);
    };

    const getPlanButtonLabel = (planId: string) => {
        if (!isNurseryOwner) return planId === 'standard' ? 'Start Standard' : 'Start Platinum';
        // Logged-in owner — they can still sign up for a new group
        if (planId === 'standard') return 'Create New Standard Group';
        return 'Create New Platinum Group';
    };

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
               <span className="text-2xl text-secondary">From</span> £{billingPeriod === 'monthly' ? PRICING[plan.id as keyof typeof PRICING]?.monthly ?? plan.price : PRICING[plan.id as keyof typeof PRICING]?.annual ?? plan.price}
                <span className="text-base font-medium text-gray-500"> {billingPeriod === 'monthly' ? plan.priceLabel : 'per year per nursery'}</span>
            </p>
            {billingPeriod === 'annual' && (
                <p className="text-xs text-green-600 font-medium mt-1">
                    Equivalent to £{PRICING[plan.id as keyof typeof PRICING]?.monthly ?? plan.price}/month
                </p>
            )}

            <ul className="mt-6 space-y-4">
                {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary mt-1" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => handlePlanSelect(plan.id)}
                className={`mt-8 w-full border rounded-xl font-semibold flex items-center justify-center gap-2 ${plan.buttonClasses}`}
            >
                {getPlanButtonLabel(plan.id)}
            </button>
        </div>
    );

    return (
        <section className="py-20 bg-white">
            <div className="mx-auto px-24 max-sm:px-4 max-md:px-8 max-lg:px-8">
                {/* Billing toggle */}
                <div className="flex justify-center mb-10">
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setBillingPeriod('monthly')}
                            className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                                billingPeriod === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingPeriod('annual')}
                            className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                                billingPeriod === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Annual
                        </button>
                    </div>
                </div>
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
                <div className="hidden lg:grid md:grid-cols-2 gap-10">
                    {pricingPlans.map((plan) => renderPricingCard(plan))}
                </div>

                <div className="pt-30 pb-30">

                    <div className="bg-white shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] rounded-2xl p-4 overflow-x-auto">


                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-left bg-gray-100 rounded-xl">
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-l-xl">Features</th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary ">
                                        Nursery Listing (Paid)
                                    </th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-r-xl">Platinum</th>
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
                                </tr>

                                <tr>
                                    <td className="p-4">Address</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Telephone</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Full Nursery Profile Page</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">About Us, Philosophy, Fees, Opening Hours</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Age Range, Facilities &amp; Services</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Card Image + Gallery Images</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Appear in City &amp; Search Results</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Parent Reviews &amp; Ratings</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Review Notifications</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Contact Enquiries from Parents</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Basic Nursery Dashboard</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Standard Search Visibility</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Unlimited Nursery Locations</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Nursery Group Page (for multiple branches)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Unlimited Image Gallery</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Video on Nursery Profile</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Team Member Profiles (including qualifications &amp; badges)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Review Management (approve, reject, respond)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Full Notification System</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Priority Placement in Search Results</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Dashboard Analytics (ratings, reviews, performance)</td>
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
