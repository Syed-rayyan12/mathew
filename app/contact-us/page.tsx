import ContactUs from '@/components/landing-page/contact-banner'
import ContactSection from '@/components/landing-page/contact-form'
import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import React from 'react'

const page = () => {
  return (
    <>
        <MiniNav />
             <Header />
       <ContactUs/>
       <ContactSection/>
         <Footer />
    </>
  )
}

export default page
