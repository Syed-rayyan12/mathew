import Footer from '@/components/landing-page/footer'
import Header from '@/components/landing-page/header'
import MiniNav from '@/components/landing-page/little-nav'
import PrivacyPolicy from '@/components/landing-page/privacy-policy'
import React from 'react'

const page = () => {
    return (
        <>
            <MiniNav />
            <Header />
            <PrivacyPolicy />
            <div className='bg-white py-20'>
                <div className="px-24 max-sm:px-8 max-md:px-14 xl:px-24 max-xl:px-16 mx-auto p-6 space-y-6">
                    
                    <section className="space-y-3">
                        <h2 className="text-[40px] font-medium">1. Information We Collect</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Name, email, phone number, and address</li>
                            <li>Children’s age groups (if provided)</li>
                            <li>Reviews, messages, or enquiries submitted on our website</li>
                            <li>Cookies and usage data</li>
                        </ul>
                    </section>


                    <section className="space-y-3">
                        <h2 className="text-[40px] font-medium">2. How We Use Information</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Respond to enquiries or schedule visits</li>
                            <li>Improve our website and services</li>
                            <li>Send newsletters or updates (with consent)</li>
                        </ul>
                    </section>


                    <section className="space-y-3">
                        <h2 className="text-[40px] font-medium">3. Cookies & Tracking</h2>
                        <p>
                            We use cookies to improve your experience and analyze website usage.
                        </p>
                    </section>


                    <section className="space-y-3">
                        <h2 className="text-[40px] font-medium">4. Data Sharing</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>We do not sell your personal data.</li>
                            <li>Data may be shared with trusted service providers (e.g., email platform)</li>
                            <li>We may disclose data if required by law.</li>
                        </ul>
                    </section>


                    <section className="space-y-3">
                        <h2 className="text-[40px] font-medium">5. Data Security</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>We implement technical and organizational measures to protect your data.</li>
                            <li>No system is 100% secure; we cannot guarantee absolute security.</li>
                        </ul>
                    </section>


                    <section className="space-y-3">
                        <h2 className="text-[40px] font-medium">6. Your Rights</h2>
                        <p>
                            You may request access, correction, or deletion of your personal data. Contact us at
                            info@[yournursery.com] for data-related requests.
                        </p>
                    </section>


                    <section className="space-y-3 pb-10">
                        <h2 className="text-[40px] font-medium">7. Updates to Privacy Policy</h2>
                        <p>
                            We may update this policy; updates will be posted on this page.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default page
