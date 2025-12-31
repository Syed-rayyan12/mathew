import React from 'react'
import { Input } from '../ui/input'
import { LocateIcon, MapPin, Star, Trash, Trash2 } from 'lucide-react'

function ShortListed() {
    return (
        <>
            <div>
                <h2 className='text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading'><span className='text-foreground'>MY</span> SHORTLIST</h2>
                <p>Manage your saved nurseries and compare options</p>
                <div className='pt-4'>
                    <Input placeholder='Search your shortlisted nurseries...' className='w-full md:w-[50%] rounded-md h-9 bg-white' />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4'>
                    <div className=''>
                        <div className='bg-white rounded-md p-3 mt-6 flex flex-col gap-4'>
                            <img src="/images/list 1.png" alt="" />
                            <div className='flex flex-col gap-3'>
                                <h3 className='text-xl font-medium font-heading'>Sunshine Nursery</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4' />
                                    <span>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>
                                    <Star className='size-4' />
                                    <span>4.5 /6</span>
                                </div>
                                <div className='flex gap-3 mt-3 justify-between items-center'>
                                    <button className='bg-secondary text-primary-foreground rounded-md px-9 py-2 '>View profile</button>
                                    <button className='border border-gray-400 text-foreground rounded-md px-2 py-2'><Trash2 className='w-5 h-5' /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className=''>
                        <div className='bg-white rounded-md p-3 mt-6 flex flex-col gap-4'>
                            <img src="/images/list 2.png" alt="" />
                            <div className='flex flex-col gap-3'>
                                <h3 className='text-xl font-medium font-heading'>LITTLE STARS ACADEMY</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4' />
                                    <span>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>
                                    <Star className='size-4' />
                                    <span>4.5 /6</span>
                                </div>
                                <div className='flex gap-3 mt-3 justify-between items-center'>
                                    <button className='bg-secondary text-primary-foreground rounded-md px-9 py-2 '>View profile</button>
                                    <button className='border border-gray-400 text-foreground rounded-md px-2 py-2'><Trash2 className='w-5 h-5' /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className=''>
                        <div className='bg-white rounded-md p-3 mt-6 flex flex-col gap-4'>
                            <img src="/images/list 3.png" alt="" />
                            <div className='flex flex-col gap-3'>
                                <h3 className='text-xl font-medium font-heading'>RAINBOW KIDS CENTER</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4' />
                                    <span>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>
                                    <Star className='size-4' />
                                    <span>4.5 /6</span>
                                </div>
                                <div className='flex gap-3 mt-3 justify-between items-center'>
                                    <button className='bg-secondary text-primary-foreground rounded-md px-9 py-2 '>View profile</button>
                                    <button className='border border-gray-400 text-foreground rounded-md px-2 py-2'><Trash2 className='w-5 h-5' /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className=''>
                        <div className='bg-white rounded-md p-3 mt-6 flex flex-col gap-4'>
                            <img src="/images/list 4.png" alt="" />
                            <div className='flex flex-col gap-3'>
                                <h3 className='text-xl font-medium font-heading'>RAINBOW KIDS CENTER</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4' />
                                    <span>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>
                                    <Star className='size-4' />
                                    <span>4.5 /6</span>
                                </div>
                                <div className='flex gap-3 mt-3 justify-between items-center'>
                                    <button className='bg-secondary text-primary-foreground rounded-md px-9 py-2 '>View profile</button>
                                    <button className='border border-gray-400 text-foreground rounded-md px-2 py-2'><Trash2 className='w-5 h-5' /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ShortListed
