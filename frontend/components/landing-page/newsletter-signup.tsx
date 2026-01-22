'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, useInView } from 'framer-motion';

const NewsletterSignup = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="py-16 bg-white" ref={ref}>
      <motion.div 
        className="container mx-auto px-4 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-4xl md:text-5xl font-heading font-medium mb-4 text-foreground leading-tight">
         Stay Updated With the Latest <span className="text-secondary">Nursery News</span> & Parent Tips 
        </h2>
        <p className="text-[16px] font-ubuntu mb-8 max-w-2xl mx-auto">
          Join our community to receive helpful parenting advice, nursery updates, and early learning insights — straight to your inbox.
        </p>
        <motion.div 
          className="relative max-w-md mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Input
            type="email"
            placeholder="Enter your email"
            className="rounded-[6px] p-6"
          />
          <Button className="absolute right-2 top-2 bottom-2 flex justify-end items-center bg-secondary hover:bg-secondary/90  rounded-[4px] px-6">
            Subscribe
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default NewsletterSignup;