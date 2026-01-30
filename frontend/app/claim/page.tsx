import ClaimBanner from '@/components/landing-page/claim-banner'
import ClaimCards from '@/components/landing-page/claim-cards'
import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import React from 'react'

const page = () => {
  return (
    <>
       <MiniNav/>
        <Header/>
        <ClaimBanner/>
        {/* <ClaimCards/> */}
        <Footer/>

    </>
  )
}

export default page
