import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import Review from '@/components/landing-page/review'
import ReviewBlog from '@/components/landing-page/review-blog'
import React from 'react'

const page = () => {
  return (
    <>
         <MiniNav/>
         <Header/>
         <Review/>
         <ReviewBlog/>
         <Footer/>
    </>
  )
}

export default page
