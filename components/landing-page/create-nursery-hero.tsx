import React from 'react'
import { Button } from '@/components/ui/button'

const CreateNurseryHero = () => {
  return (
    <section className="bg-cover bg-white bg-center h-full flex items-center justify-center" style={{ backgroundImage: "url('/images/Vector 16.png')" }}>
      <div className="text-center flex justify-center flex-col max-w-3xl px-6 py-24 ">
         <h2 className="text-4xl md:text-5xl font-heading font-bold text-white leading-tight mt-10">
                           Join hundreds of nurseries growing with <span className="text-secondary">My Nursery</span>.
                        </h2>
        <p className="mb-4 mt-4 text-white">At My Nursery, we help nursery owners and childcare groups reach more local families, build trust through genuine reviews, and manage their listings with ease.  Our platform gives you all the tools you need to grow visibility, attract new families, and showcase what makes your nursery special.</p>
        <div>
        <Button className='bg-secondary rounded-md py-5 px-6'>Create Your Nursery Profile</Button>
        </div>
      </div>
    </section>
  )
}

export default CreateNurseryHero