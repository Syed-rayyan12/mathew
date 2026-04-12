import Header from '@/components/landing-page/header'
import Footer from '@/components/landing-page/footer'
import MiniNav from '@/components/landing-page/little-nav'
import JobsContent from '@/components/landing-page/jobs-content'


export const metadata = {
  title: 'Jobs | Current Openings',
  description: 'Explore current job openings and apply today.',
}

export default function JobsPage() {
  return (
    <>
      <MiniNav />
      <Header />
      <JobsContent />
      <Footer />
    </>
  )
}
