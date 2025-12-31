import React from 'react'
import AboutBanner from '@/components/landing-page/about-banner'
import AboutLeft from '@/components/landing-page/about-left'
import WhatWeDo from '@/components/landing-page/what-we-do'
import OurStory from '@/components/landing-page/our-story'
import CircleGridSection from '@/components/landing-page/circle-grid-section'
import TestimonialSlider from '@/components/landing-page/testimonial-slider'
import NewsletterSignup from '@/components/landing-page/newsletter-signup'
import MiniNav from '@/components/landing-page/little-nav'
import Header from '@/components/landing-page/header'
import Footer from '@/components/landing-page/footer'

const page = () => {
  return (
    <>
      <MiniNav />
      <Header />
      <AboutBanner />
      <AboutLeft />
      <WhatWeDo />
      <OurStory />
      <CircleGridSection />
      <TestimonialSlider />
      <NewsletterSignup />
      <Footer />
    </>
  )
}

export default page
