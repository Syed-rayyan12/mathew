import React from 'react'
import { Input } from '../ui/input'
import { LocateIcon, MapPin, Star, Trash, Trash2 } from 'lucide-react'
import { Button } from '../ui/button';

function RecentlyViewed() {
    return (
        <>
            <div>
                <div className='flex justify-between items-center'>
                <div>

                <h2 className='text-secondary font-medium text-[48px] font-heading'><span className='text-foreground'>RECENTLY </span>VIEWED</h2>
                <p>Nurseries you've recently visited</p>
                </div>
                <div>
                    <Button className='border rounded-md bg-transparent text-red-500 px-6 py-2 border-red-500'>View All</Button>
                </div>
                </div>

                <div className='flex flex-col'>

                    <div className='bg-white rounded-md p-3 mt-6 flex   justify-between items-center gap-4'>
                        <div className='flex gap-2 items-center'>
                            <img src="/images/list 1.png" alt="" className='w-30  object-cover rounded-md' />
                            <div className='flex flex-col gap-1'>
                                <h3 className='text-xl font-medium font-heading'>Sunshine Nursery</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4 text-gray-400' />
                                    <span className='text-gray-400 text-sm'>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>

                                    <span className='text-gray-400 text-sm px-1'>Viewed 2 hrs ago</span>
                                </div>

                            </div>
                        </div>
                        <button className='bg-secondary text-white rounded-md px-4 py-1'>View Profile</button>
                    </div>

                    <div className='bg-white rounded-md p-3 mt-6 flex   justify-between items-center gap-4'>
                        <div className='flex gap-2 items-center'>
                            <img src="/images/list 2.png" alt="" className='w-30 object-cover rounded-md' />
                            <div className='flex flex-col gap-1'>
                                <h3 className='text-xl font-medium font-heading'>Sunshine Nursery</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4 text-gray-400' />
                                    <span className='text-gray-400 text-sm'>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>

                                    <span className='text-gray-400 text-sm px-1'>Viewed 2 hrs ago</span>
                                </div>

                            </div>
                        </div>
                        <button className='bg-secondary text-white rounded-md px-4 py-1'>View Profile</button>
                    </div>
                    <div className='bg-white rounded-md p-3 mt-6 flex   justify-between items-center gap-4'>
                        <div className='flex gap-2 items-center'>
                            <img src="/images/list 3.png" alt="" className='w-30 object-cover rounded-md' />
                            <div className='flex flex-col gap-1'>
                                <h3 className='text-xl font-medium font-heading'>Sunshine Nursery</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4 text-gray-400' />
                                    <span className='text-gray-400 text-sm'>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>

                                    <span className='text-gray-400 text-sm px-1'>Viewed 2 hrs ago</span>
                                </div>

                            </div>
                        </div>
                        <button className='bg-secondary text-white rounded-md px-4 py-1'>View Profile</button>
                    </div>
                    <div className='bg-white rounded-md p-3 mt-6 flex   justify-between items-center gap-4'>
                        <div className='flex gap-2 items-center'>
                            <img src="/images/list 4.png" alt="" className='w-30 object-cover rounded-md' />
                            <div className='flex flex-col gap-1'>
                                <h3 className='text-xl font-medium font-heading'>Sunshine Nursery</h3>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='size-4 text-gray-400' />
                                    <span className='text-gray-400 text-sm'>London, UK</span>
                                </div>
                                <div className='flex items-center gap-2 '>

                                    <span className='text-gray-400 text-sm px-1'>Viewed 2 hrs ago</span>
                                </div>

                            </div>
                        </div>
                        <button className='bg-secondary text-white rounded-md px-4 py-1'>View Profile</button>
                    </div>


                </div>
            </div>
        </>
    )
}

export default RecentlyViewed;
