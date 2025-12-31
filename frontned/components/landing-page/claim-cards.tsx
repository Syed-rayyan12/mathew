import { ShieldCheck, GraduationCap, Puzzle, Timer, Smile, Heart } from 'lucide-react';
import React from 'react'
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const claimCards = [
    {
        title: "Appear in Search Results",
        desc: "Get discovered by parents searching for nurseries in  your area. Increase your visibility and reach more families.",
        icon: <ShieldCheck className="text-secondary" size={24} />,
    },
    {
        title: "Showcase Your Nursery",
        desc: "Display photos, facilities, fees, opening hours, and everything that makes your nursery special. ",
        icon: <GraduationCap className="text-secondary" size={24} />,
    },
    {
        title: "Collect Authentic Reviews",
        desc: "Build trust with genuine parent reviews and ratings. Let your reputation speak for itself. ",
        icon: <Puzzle className="text-secondary" size={24} />,
    },
    {
        title: "Access Your Dashboard",
        desc: "Manage your profile, respond to enquiries, and track your listing performance all in one place. ",
        icon: <Timer className="text-secondary" size={24} />,
    },


];

const ClaimCards = () => {
    return (
        <>
            <div className='text-center pt-10 pb-14 px-24 max-sm:px-4 max-md:px-8 bg-white'>
                <h2 className="text-[48px] font-medium font-heading">Why List Your Nursery With Us?</h2>

                {/* Paragraph 2 lines */}
                <p className="text-gray-600 mt-3 max-w-3xl mx-auto">
                    Explore all the ways you can reduce your childcare costs through government support and funding schemes.
                </p>

                {/* Cards Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4  gap-6 mt-12">
                    {claimCards.map((card, index) => (
                        <div
                            key={index}
                            className="border border-gray-200 rounded-md p-6 text-left bg-white"
                        >
                            {/* Icon + Heading */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#D8F6FD] text-2xl">
                                    {card.icon}
                                </div>
                                <h3 className="text-lg font-medium font-heading">{card.title}</h3>

                                {/* Paragraph */}
                                <p className=" text-gray-600 text-center text-sm">{card.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className='mt-10 mb-10 px-26 max-sm:px-4 max-lg:px-4'>
                    <h2 className="text-[48px] font-medium font-heading">How It Works</h2>

                    {/* Paragraph 2 lines */}
                    <p className="text-gray-600  max-w-3xl mx-auto">
                        Get listed in four simple steps.
                    </p>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mt-12 mb-12'>
                        <div className='text-center flex flex-col justify-center items-center gap-3 '>
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary text-2xl">
                                <span className='text-white'>1</span>
                            </div>
                            <h3 className="text-lg font-medium font-heading">Fill the Form</h3>
                            <p>Provide your nursery details</p>
                        </div>
                        <div className='text-center flex flex-col justify-center items-center gap-3'>
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary text-2xl">
                                <span className='text-white'>2</span>
                            </div>
                            <h3 className="text-lg font-medium font-heading">We Verify</h3>
                            <p>Our team confirms your nursery</p>
                        </div>
                        <div className='text-center flex flex-col justify-center items-center gap-3'>
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary text-2xl">
                                <span className='text-white'>3</span>
                            </div>
                            <h3 className="text-lg font-medium font-heading">Go Live</h3>
                            <p>Your profile is published</p>
                        </div>
                        <div className='text-center flex flex-col justify-center items-center gap-3'>
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary text-2xl">
                                <span className='text-white'>4</span>
                            </div>
                            <h3 className="text-lg font-medium font-heading">Get Enquiries</h3>
                            <p>Start receiving parent contacts</p>
                        </div>
                    </div>

                </div>

                <div>
                    <h2 className="text-[48px] font-medium font-heading">Start Your Free Listing</h2>

                    {/* Paragraph 2 lines */}

                    <p className="text-gray-600 mt-3 max-w-3xl  mx-auto">
                        Fill in your details and we'll get you set up.
                    </p>
                    <div className='bg-white mt-10 shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] rounded-lg p-8 px-26 max-sm:px-4 lg:px-4 max-lg:px-4'>
                        <form className="space-y-8">
                            {/* Select Nursery */}

                            {/* Overall Rating */}
                            <div className="space-y-2">
                                <Label htmlFor="rating" className="text-[20px] text-muted-foreground font-sans font-medium">
                                    Nursery Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    placeholder="Summarize your experience"
                                    className="w-full h-12"
                                />
                            </div>

                            {/* Review Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-[20px] text-muted-foreground text-muted-foreground font-sans font-medium">
                                    Owner/Manager Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="owner"
                                    type="text"
                                    required
                                    placeholder="Summarize your experience"
                                    className="w-full h-12"
                                />
                            </div>

                            <div className="space-y-2 flex items-center max-sm:flex-col w-full gap-4">
                                <div className='w-full'>

                                    <Label htmlFor="email" className="text-[20px] text-muted-foreground font-sans font-medium">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        placeholder="Enter your email"
                                        className="w-full h-12"
                                    />
                                </div>
                                <div className='w-full'>

                                    <Label htmlFor="email" className="text-[20px] text-muted-foreground font-sans font-medium">
                                        phone <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        placeholder="Enter your email"
                                        className="w-full h-12"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 flex items-center max-sm:flex-col w-full gap-4">
                                <div className='w-full'>

                                    <Label htmlFor="postcode" className="text-[20px] text-muted-foreground font-sans font-medium">
                                        Postcode  <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="postcode"
                                        type="text"
                                        required
                                        placeholder="Enter your email"
                                        className="w-full h-12"
                                    />
                                </div>
                                <div className='w-full'>

                                    <Label htmlFor="website" className="text-[20px] text-muted-foreground font-sans font-medium">
                                        Website (Optional) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="website"
                                        type="text"
                                        required
                                        placeholder="Enter your email"
                                        className="w-full h-12"
                                    />
                                </div>
                            </div>

                            {/* Confirmation Checkbox */}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-lg font-medium mt-6"
                            >
                                Start Free Listing
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ClaimCards;
