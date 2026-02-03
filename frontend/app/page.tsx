import Header from '@/components/landing-page/header'
import HeroBanner from '@/components/landing-page/hero-banner'
import MiniNav from '@/components/landing-page/little-nav'
import FeaturesSection from '@/components/landing-page/features-section'
import FeaturesCardsSection from '@/components/landing-page/features-cards-section'
import AboutUsSection from '@/components/landing-page/about-us-section'
import NurseryCardsSection from '@/components/landing-page/nursery-cards-section'
import TestimonialSlider from '@/components/landing-page/testimonial-slider'
import CircleGridSection from '@/components/landing-page/circle-grid-section'
import CTASection from '@/components/landing-page/cta-section'
import CreateNurseryHero from '@/components/landing-page/create-nursery-hero'
import ArticleNews from '@/components/landing-page/article-news'
import NewsletterSignup from '@/components/landing-page/newsletter-signup'
import Footer from '@/components/landing-page/footer'


const page = () => {
  return (
    <>

      <MiniNav />
      <Header />
      <HeroBanner />
       <CTASection />
      {/* <FeaturesSection /> */}
      <AboutUsSection />
      <NurseryCardsSection />
      <CircleGridSection />
      <FeaturesCardsSection />
      <CTASection />
      <CreateNurseryHero />
      <TestimonialSlider />
      <ArticleNews />
      <NewsletterSignup  />
      <Footer />


    </>
  )
}

export default page
