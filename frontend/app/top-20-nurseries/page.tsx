import Header from '@/components/landing-page/header'
import Footer from '@/components/landing-page/footer'
import MiniNav from '@/components/landing-page/little-nav'
import Top20NurseriesContent from '@/components/landing-page/top20-nurseries-content'

export const metadata = {
  title: 'Top 20 Nurseries | Best Rated UK Nurseries',
  description: 'Discover the top 20 highest-rated nurseries across the UK, ranked by parent reviews.',
}

export default function Top20NurseriesPage() {
  return (
    <>
      <MiniNav />
      <Header />
      <Top20NurseriesContent />
      <Footer />
    </>
  )
}
