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
import NurseryCountPicker from "@/components/sharedComponents/nursery-count-picker";
import { MIN_GROUP_SIZE, formatGbp, priceFor, type PlanTier } from "@/lib/pricing";

const STANDARD_FEATURES = [
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
];

const PLATINUM_FEATURES = [
    "Nursery Group Page (for multiple branches)",
    "Unlimited Image Gallery",
    "Video on Nursery Profile",
    "Team Member Profiles (including qualifications & badges)",
    "Review Management (approve, reject, respond)",
    "Full Notification System",
    "Priority Placement in Search Results",
    "Dashboard Analytics (ratings, reviews, performance)",
    "Job Listings",
];

const buttonClasses =
    "bg-transparent border-secondary py-4 px-6 hover:bg-secondary hover:text-white transition-colors duration-200";

/**
 * Three sellable products. `tier` is the wire value the backend reads from the
 * `plan` field — it stays standard/platinum. Group is Platinum bought for two
 * or more nurseries, which is why it carries the same tier as Single Platinum.
 */
const pricingPlans: {
    id: string;
    tier: PlanTier;
    isGroupCard: boolean;
    title: string;
    subtitle: string;
    features: string[];
    buttonText: string;
    buttonClasses: string;
    popular?: boolean;
    priceLabel: string;
}[] = [
    {
        id: "single-standard",
        tier: "standard",
        isGroupCard: false,
        title: "Single Standard",
        subtitle: "For a one-site nursery",
        features: STANDARD_FEATURES,
        buttonText: "Start Single Standard",
        buttonClasses,
        popular: true,
        priceLabel: " per month",
    },

    {
        id: "single-platinum",
        tier: "platinum",
        isGroupCard: false,
        title: "Single Platinum",
        subtitle: "One nursery, with every Platinum feature",
        features: PLATINUM_FEATURES,
        buttonText: "Start Single Platinum",
        buttonClasses,
        priceLabel: " per month",
    },

    {
        id: "group",
        tier: "platinum",
        isGroupCard: true,
        title: "Group",
        subtitle: "Two or more nurseries, with a volume discount",
        features: ["Volume discount — up to 40% off per nursery", ...PLATINUM_FEATURES],
        buttonText: "Start Group",
        buttonClasses,
        priceLabel: "per nursery per month",
    },
];

export default function PricingSection() {
    const router = useRouter();
    const [isNurseryOwner, setIsNurseryOwner] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    // Group pricing is per-nursery and banded, so the card needs a count to quote against.
    const [nurseryCount, setNurseryCount] = useState<number>(MIN_GROUP_SIZE);

    const groupQuote = priceFor('platinum', billingPeriod, nurseryCount);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('nurseryUser');
            const user = raw ? JSON.parse(raw) : null;
            if (user && user.role === 'NURSERY_OWNER') {
                setIsNurseryOwner(true);
            }
        } catch { /* not logged in */ }
    }, []);

    // Pricing page buttons always go to nursery-signup (new group).
    // Upgrading an existing account is done from the nursery dashboard only.
    const handlePlanSelect = (plan: typeof pricingPlans[0]) => {
        // Groups past the self-serve ceiling are quoted by hand, so there is no
        // checkout to send them to.
        if (plan.isGroupCard && groupQuote.bespoke) {
            router.push('/contact-us');
            return;
        }
        // Singles always cover exactly one nursery; only Group carries a count.
        const count = plan.isGroupCard ? nurseryCount : 1;
        router.push(
            `/nursery-signup?plan=${plan.tier}&billing=${billingPeriod}&nurseries=${count}`
        );
    };

    const getPlanButtonLabel = (plan: typeof pricingPlans[0]) => {
        if (!isNurseryOwner) return plan.buttonText;
        // Logged-in owner — they can still sign up for a new listing
        return plan.isGroupCard ? 'Create New Group' : `Create New ${plan.title} Listing`;
    };

    const buttonLabelFor = (plan: typeof pricingPlans[0]) =>
        plan.isGroupCard && groupQuote.bespoke
            ? 'Contact us for a quote'
            : getPlanButtonLabel(plan);

    const renderPricingCard = (plan: typeof pricingPlans[0]) => {
        // Singles are quoted at exactly one nursery; Group uses the picker.
        const singleQuote = priceFor(plan.tier, billingPeriod, 1);

        return (
        <div
            key={plan.id}
            className={`
                relative rounded-2xl p-8 border transition-all

                ${plan.popular
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

            {plan.isGroupCard ? (
                <>
                    <p className="text-4xl font-bold mt-6">
                        <span className="text-2xl text-secondary">From</span> {formatGbp(groupQuote.unitPence)}
                        <span className="text-base font-medium text-gray-500">
                            {' '}per nursery per {billingPeriod === 'monthly' ? 'month' : 'year'}
                        </span>
                    </p>
                    <div className="mt-5">
                        <NurseryCountPicker
                            count={nurseryCount}
                            onChange={setNurseryCount}
                            billing={billingPeriod}
                            footnote="The discount is applied automatically — the more nurseries in your group, the lower the price per nursery."
                        />
                    </div>
                </>
            ) : (
                <>
                    <p className="text-4xl font-bold mt-6">
                        {formatGbp(singleQuote.totalPence)}
                        <span className="text-base font-medium text-gray-500">
                            {' '}per {billingPeriod === 'monthly' ? 'month' : 'year'}
                        </span>
                    </p>
                    {billingPeriod === 'annual' && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                            Equivalent to {formatGbp(priceFor(plan.tier, 'monthly', 1).totalPence)}/month
                        </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Covers one nursery. Got more than one? See Group.
                    </p>
                </>
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
                onClick={() => handlePlanSelect(plan)}
                className={`mt-8 w-full border rounded-xl font-semibold flex items-center justify-center gap-2 ${plan.buttonClasses}`}
            >
                {buttonLabelFor(plan)}
            </button>
        </div>
        );
    };

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
                <div className="hidden lg:grid lg:grid-cols-3 gap-10">
                    {pricingPlans.map((plan) => renderPricingCard(plan))}
                </div>

                <div className="pt-30 pb-30">

                    <div className="bg-white shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] rounded-2xl p-4 overflow-x-auto">


                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-left bg-gray-100 rounded-xl">
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-l-xl">Features</th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary ">
                                        Single Standard
                                    </th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary ">
                                        Single Platinum
                                    </th>
                                    <th className="p-4  font-medium font-heading text-[28px] text-secondary rounded-r-xl">Group</th>
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
                                    <td className="p-4">Full Nursery Profile Page</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">About Us, Philosophy, Fees, Opening Hours</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Age Range, Facilities &amp; Services</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Card Image + Gallery Images</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Appear in City &amp; Search Results</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Parent Reviews &amp; Ratings</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Review Notifications</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Contact Enquiries from Parents</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Basic Nursery Dashboard</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Standard Search Visibility</td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>

                                <tr>
                                    <td className="p-4">Nursery Locations</td>
                                    <td className="text-center font-medium">1</td>
                                    <td className="text-center font-medium">1</td>
                                    <td className="text-center font-medium">2&ndash;60</td>
                                </tr>
                                <tr>
                                    <td className="p-4">Nursery Group Page (for multiple branches)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Unlimited Image Gallery</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Video on Nursery Profile</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Team Member Profiles (including qualifications &amp; badges)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Review Management (approve, reject, respond)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Full Notification System</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Priority Placement in Search Results</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Dashboard Analytics (ratings, reviews, performance)</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
                                </tr>
                                <tr>
                                    <td className="p-4">Job Listings</td>
                                    <td className="text-center"><X className="text-red-500" /></td>
                                    <td className="text-center"><Check className="text-secondary" /></td>
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
