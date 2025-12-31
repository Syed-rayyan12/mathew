import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import NurseryGrid from '@/components/landing-page/product-grid'
import ProductBanner from '@/components/landing-page/products-banner'
import React from 'react'

const page = () => {
  return (
    <>
      <MiniNav />
      <Header />
      <ProductBanner />
      <NurseryGrid />
      <Footer />
    </>
  )
}

export default page
