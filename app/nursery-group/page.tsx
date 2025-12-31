import AboutBanner from '@/components/landing-page/about-banner'
import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import NurseryGroup from '@/components/landing-page/nursery-group'
import NurseryGroupBanner from '@/components/landing-page/nursery-group-banner'
import React from 'react'

const page = () => {
  return (
    <>
       <MiniNav />
        <Header />
       <NurseryGroupBanner/>
       <NurseryGroup/>
        <Footer />
    </>
  )
}

export default page
