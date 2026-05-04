import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import NurseryGroup from '@/components/landing-page/nursery-group'
import NurseryGroupBanner from '@/components/landing-page/nursery-group-banner'
import Link from 'next/link'
import React, { Suspense } from 'react'

const page = () => {
  return (
    <>
       <MiniNav />
        <Header />
       <NurseryGroupBanner/>
       <div className="w-full px-8 md:px-14 xl:px-24 max-xl:px-16 py-6">
         <Link
           href="/nursery-signup?plan=standard"
           className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base px-6 py-3 rounded-md transition-colors duration-200"
         >
           Add Your Nursery Group
         </Link>
       </div>
       <Suspense fallback={
         <div className="min-h-screen flex items-center justify-center">
           <div className="text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
             <p className="text-gray-600">Loading nursery groups...</p>
           </div>
         </div>
       }>
         <NurseryGroup/>
       </Suspense>
        <Footer />
    </>
  )
}

export default page
