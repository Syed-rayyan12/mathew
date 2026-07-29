'use client'

import React, { useState } from 'react'
import { MapPin, Mail, Phone, Facebook, Twitter, Youtube, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { contactService } from '@/lib/api/contact'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  message: '',
}

const ContactSection = () => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const setField = (field: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)

    try {
      const res = await contactService.submit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim(),
      })

      if (res.success) {
        setForm(EMPTY_FORM)
        setStatus({ type: 'success', text: "Thanks — your message has been sent. We'll be in touch shortly." })
      } else {
        setStatus({ type: 'error', text: res.message || res.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setStatus({ type: 'error', text: 'Could not send your message. Please try again, or email us directly.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full  mx-auto py-16 max-sm:px-8 px-24 bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Side - Contact Info */}
        <div className="space-y-8 border border-secondary p-4 rounded-[6px]">
          {/* Reach Out to Us */}
          <div className=''>
            <h2 className="text-4xl font-heading font-bold max-sm:font-medium">Reach Out to Us</h2>
            <p className='text-[16px] font-medium font-sans mb-6'>We’re here to assist with any questions,
              Connect with our team today</p>
            <div className="space-y-4">
              {/* Location */}
              <div className="flex items-start gap-3">
                <div className='flex justify-center  items-center w-10 h-10 border border-gray-400 rounded-full '>
                  <MapPin className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-gray-700">Address – Shawbriggs, Barrow Road, Goxhill, North Lincolnshire,</p>
                  <p className="text-gray-700">DN19 7LN</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <div className='flex justify-center  items-center w-10 h-10 border border-gray-400 rounded-full '>
                  <Mail className="w-5 h-5 text-secondary" />
                </div>
                <a href="mailto:hello@my-nursery.co.uk" className="text-gray-700 hover:text-secondary">
                  hello@my-nursery.co.uk
                </a>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <div className='flex justify-center  items-center w-10 h-10 border border-gray-400 rounded-full '>
                  <Phone className="w-5 h-5 text-secondary" />
                </div>
                <a href="tel:+441482688508" className="text-gray-700 hover:text-secondary">
                  01482 688508
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-heading font-bold max-sm:font-medium mb-4">Follow Us</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-12 h-12 rounded-full border-1 border-gray-200 flex items-center justify-center hover:border-secondary transition-colors"
              >
                <Facebook className="w-5 h-5 text-secondary" />
              </a>
              <a
                href="#"
                className="w-12 h-12 rounded-full border-1 border-gray-200 flex items-center justify-center hover:border-secondary transition-colors"
              >
                <Twitter className="w-5 h-5 text-secondary" />
              </a>
              <a
                href="#"
                className="w-12 h-12 rounded-full border-1 border-gray-200 flex items-center justify-center hover:border-secondary transition-colors"
              >
                <Youtube className="w-5 h-5 text-secondary" />
              </a>
              <a
                href="#"
                className="w-12 h-12 rounded-full border-1 border-gray-200 flex items-center justify-center hover:border-secondary transition-colors"
              >
                <Instagram className="w-5 h-5 text-secondary" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Side - Contact Form */}
        <div>
          <h2 className="text-4xl font-heading font-bold mb-4">
            Send Us a <span className="text-secondary">Message</span>
          </h2>
          <p className="text-gray-600 mb-6">Connect with our team today</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* First Name & Last Name */}
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="First Name"
                className="flex-1"
                required
                value={form.firstName}
                onChange={setField('firstName')}
                disabled={submitting}
              />
              <Input
                type="text"
                placeholder="Last Name"
                className="flex-1"
                required
                value={form.lastName}
                onChange={setField('lastName')}
                disabled={submitting}
              />
            </div>

            {/* Email & Phone */}
            <div className="flex gap-4">
              <Input
                type="email"
                placeholder="Email"
                className="flex-1"
                required
                value={form.email}
                onChange={setField('email')}
                disabled={submitting}
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                className="flex-1"
                required
                value={form.phone}
                onChange={setField('phone')}
                disabled={submitting}
              />
            </div>

            {/* Message */}
            <Textarea
              placeholder="Your Message"
              className="min-h-[150px]"
              required
              value={form.message}
              onChange={setField('message')}
              disabled={submitting}
            />

            {status && (
              <p
                role="status"
                className={`text-sm ${status.type === 'success' ? 'text-secondary' : 'text-red-600'}`}
              >
                {status.text}
              </p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-lg font-medium disabled:opacity-60"
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ContactSection