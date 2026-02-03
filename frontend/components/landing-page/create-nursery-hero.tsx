'use client';

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link';

const CreateNurseryHero = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="bg-cover bg-white bg-center h-full flex items-center justify-center" style={{ backgroundImage: "url('/images/Vector 16.png')" }} ref={ref}>
      <motion.div 
        className="text-center flex justify-center flex-col max-w-3xl px-6 py-24 "
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8 }}
      >
         <motion.h2 
           className="text-4xl md:text-5xl font-heading font-bold text-white leading-tight mt-10"
           initial={{ opacity: 0, y: 30 }}
           animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
           transition={{ duration: 0.8, delay: 0.2 }}
         >
                           Join hundreds of nurseries growing with <span className="text-secondary">My Nursery</span>.
                        </motion.h2>
        <motion.p 
          className="mb-8 mt-4 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >At My Nursery, we help nursery owners and childcare groups reach more local families, build trust through genuine reviews, and manage their listings with ease.  Our platform gives you all the tools you need to grow visibility, attract new families, and showcase what makes your nursery special.</motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
        <Link href="/nursery-signup" className='bg-secondary rounded-md py-4 px-6 text-white mt-4'>Create Your Nursery Profile</Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default CreateNurseryHero
