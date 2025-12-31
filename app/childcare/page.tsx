import Childcare from '@/components/landing-page/childcare'
import ChildcareBanner from '@/components/landing-page/childcare-banner'
import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import React from 'react'

const page = () => {
  return (
    <>
       <MiniNav/>
       <Header/>
       <ChildcareBanner/>
       <Childcare/>
       <Footer/>
    </>
  )
}

export default page
