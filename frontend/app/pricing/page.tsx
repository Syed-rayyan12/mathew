import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import Pricing from '@/components/landing-page/pricing'
import PricingBanner from '@/components/landing-page/pricng-banner'
import React from 'react'

const page = () => {
  return (
    <>

      <MiniNav/>
      <Header/>
      <PricingBanner/>
      <Pricing/>
      <Footer/>
    </>
  )
}

export default page
