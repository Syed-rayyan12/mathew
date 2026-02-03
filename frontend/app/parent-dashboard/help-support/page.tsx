'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function SupportSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    message: '',
  });

  const faqs = [
    {
      question: 'how can I contact support?',
      answer: 'you can contact us through the support form on this page or email support@example.com.',
    },
    {
      question: 'what Is your refund policy?',
      answer: 'we offer full refunds within 30 days of purchase if the product has not been used.',
    },
    {
      question: 'do you offer discounts?',
      answer: 'yes! we occasionally offer seasonal discounts and promotional offers.',
    },
    {
      question: 'how can I update my profile?',
      answer: 'go to your account settings and click on "edit profile" to update your details.',
    },
    {
      question: 'can I delete my account?',
      answer: 'yes, please reach out to support for account deletion requests.',
    },
  ];

  const toggleAccordion = (index: any) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format UK phone number
    if (value.startsWith('44')) {
      // International format +44
      value = '+' + value;
      if (value.length > 3) {
        value = value.slice(0, 3) + ' ' + value.slice(3);
      }
      if (value.length > 8) {
        value = value.slice(0, 8) + ' ' + value.slice(8);
      }
    } else if (value.startsWith('0')) {
      // Local format
      if (value.startsWith('07')) {
        // Mobile: 07XXX XXXXXX
        if (value.length > 5) {
          value = value.slice(0, 5) + ' ' + value.slice(5, 11);
        }
      } else if (value.startsWith('02')) {
        // London: 020 XXXX XXXX
        if (value.length > 3) {
          value = value.slice(0, 3) + ' ' + value.slice(3, 7) + ' ' + value.slice(7, 11);
        }
      } else {
        // Other local: 01XXX XXXXXX
        if (value.length > 5) {
          value = value.slice(0, 5) + ' ' + value.slice(5, 11);
        }
      }
    } else if (value.length > 0) {
      // Assume UK mobile without leading 0
      value = '0' + value;
      if (value.length > 5) {
        value = value.slice(0, 5) + ' ' + value.slice(5, 11);
      }
    }
    
    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <div className="grid md:grid-cols-1 gap-6 font-sans">
      {/* FAQ Card */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-bold  text-foreground font-sans">frequently asked questions</h2>

        <div className="space-y-3 mt-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="  overflow-hidden border-b transition-all duration-300"
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex justify-between items-center  py-3 text-left font-sans font-medium text-base normal-case"
              >
                {faq.question}
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''
                    }`}
                />
              </button>

              <div
                className={`transition-all duration-300 overflow-hidden ${openIndex === index ? 'max-h-40' : 'max-h-0'
                  }`}
              >
                <div className="px-4 py-3 text-gray-600 font-sans border-t bg-gray-50">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support Card */}
      <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between">
        <h2 className="text-2xl font-bold  text-gray-800 font-sans">Contact Support</h2>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-[16px] text-foreground font-sans">
              email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-gray-50 font-sans"
              required
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-[16px] text-foreground font-sans">
              phone number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="07XXX XXXXXX or +44 7XXX XXXXXX"
              value={formData.phone}
              onChange={handlePhoneChange}
              className="bg-gray-50 font-sans"
              maxLength={17}
              required
            />
            <p className="text-xs text-gray-500 font-sans">
              UK format: Local (07XXX XXXXXX) or International (+44 7XXX XXXXXX)
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-foreground text-[16px] font-sans">
              message
            </label>
            <Textarea
              id="message"
              placeholder="write your message here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="bg-gray-50 min-h-[120px] font-sans"
              required
            />
          </div>
          <div className="flex justify-start">
            <Button type="submit" className="w-full bg-blue-500 text-white hover:bg-blue-600 font-sans">
              Send Message
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
