import ArticleBanner from '@/components/landing-page/article-banner';
import ArticleTabs from '@/components/landing-page/article-tabs';
import Footer from '@/components/landing-page/footer';
import Header from '@/components/landing-page/header';
import MiniNav from '@/components/landing-page/little-nav';
import React from 'react'

const page = () => {
  return (
    <>
    <MiniNav/>
      <Header/> 
      <ArticleBanner/>
      <ArticleTabs/>
      <Footer/>
    </>
  )
}

export default page;
