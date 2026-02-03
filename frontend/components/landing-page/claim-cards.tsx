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

               
            </div>
        </>
    )
}

export default ClaimCards;
