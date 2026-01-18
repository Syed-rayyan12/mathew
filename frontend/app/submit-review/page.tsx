import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import ReviewBanner from '@/components/landing-page/review-banner'
import NurseryReviewForm from '@/components/landing-page/review-form'
import { Suspense } from 'react'


import React from 'react'

const page = () => {
    return (
        <>
            <MiniNav />
            <Header />
            <ReviewBanner />
            <Suspense fallback={<div className="flex justify-center items-center min-h-[400px]">Loading...</div>}>
                <NurseryReviewForm />
            </Suspense>
            <Footer />
        </>
    )
}

export default page
