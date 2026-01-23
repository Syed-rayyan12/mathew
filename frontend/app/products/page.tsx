import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import NurseryGrid from '@/components/landing-page/product-grid'
import ProductBanner from '@/components/landing-page/products-banner'
import React, { Suspense } from 'react'

const page = () => {
  return (
    <>
      <MiniNav />
      <Header />
      <ProductBanner />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading nurseries...</p>
          </div>
        </div>
      }>
        <NurseryGrid />
      </Suspense>
      <Footer />
    </>
  )
}

export default page
