'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react'

export default function SupportSection() {
    const supportCards = [
        {
            title: 'Phone Support',
            desc: 'Available Monday-Friday, 9AM-5PM',
            phone: '+44 (800) NURSERY',
            icon: Phone,
        },
        {
            title: 'Email Support',
            desc: 'Available Monday-Friday, 9AM-5PM',
            phone: 'Suppport@nursery.com',
            icon: Mail,
        },
    ]

    const faqs = [
        {
            question: 'How can I contact support?',
            answer:
                'You can contact our support team by phone during business hours or by email anytime.',
        },
        {
            question: 'What are your working hours?',
            answer:
                'We are available Monday to Friday, from 9AM to 5PM for all inquiries.',
        },
        {
            question: 'How long does it take to get a response?',
            answer:
                'Our average response time is within 24 hours during business days.',
        },
        {
            question: 'Can I request a callback?',
            answer:
                'Yes, you can request a callback through our support form and we will reach out to you shortly.',
        },
    ]

    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <div className="space-y-6 font-sans ">
            {/* Two Support Cards in One Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {supportCards.map((card, index) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={index}
                            className="bg-white flex flex-col p-4 gap-2 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition"
                        >
                            <div className='flex items-center gap-2'>
                                <Icon className="w-5 h-5 text-secondary" />
                                <h2 className="text-lg font-semibold font-sans text-foreground">
                                    {card.title}
                                </h2>
                            </div>

                            <p className="text-sm text-gray-500">{card.desc}</p>

                            <p className="text-base font-semibold text-secondary">
                                {card.phone}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* FAQ Card Below */}
            <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-800">
                        Frequently Asked Questions
                    </CardTitle>
                    <p className='text-gray-600'>Find quick answers to common questions</p>
                </CardHeader>

                <CardContent className="space-y-3">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition"
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="flex justify-between items-center w-full text-left transition-all duration-300"
                            >
                                <span className="font-medium text-gray-800">
                                    {faq.question}
                                </span>
                                {openIndex === index ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                            </button>

                            {openIndex === index && (
                                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
