"use client";
import { ArrowRight, Star, Search } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input';
import { nurseryGroupService, NurseryGroup } from '@/lib/api/nursery-group';
import { toast } from 'sonner';

const nurseryGroup = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [nurseryGroups, setNurseryGroups] = useState<NurseryGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNurseryGroups = async () => {
            try {
                const response = await nurseryGroupService.getAllGroups();
                if (response.success && Array.isArray(response.data)) {
                    setNurseryGroups(response.data);
                }
            } catch (error) {
                console.error('Error fetching nursery groups:', error);
                toast.error('Failed to load nursery groups');
            } finally {
                setLoading(false);
            }
        };

        fetchNurseryGroups();
    }, []);

    const filteredGroups = nurseryGroups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <div className=' px-24 max-sm:px-6  pt-20 pb-60 bg-white'>
                  <div className='flex items-center justify-between mb-10 max-sm:flex-col max-sm:items-start gap-4'>
                    <div className='flex items-center gap-4'>
                        <span className='text-secondary text-[28px] font-semibold'>({filteredGroups.length.toString().padStart(2, '0')})</span>
                        <span className='text-foreground text-[28px] font-semibold'>nursery groups found</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search nursery groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                    </div>
                <div className="grid grid-cols-3  max-lg:grid-cols-1 max-lg:gap-34  gap-6">
                  
                    {loading ? (
                        <div className="col-span-3 text-center py-20">
                            <p className="text-gray-500 text-lg">Loading nursery groups...</p>
                        </div>
                    ) : filteredGroups.length > 0 ? (
                        filteredGroups.map((group) => (
                            <div
                                key={group.id}
                                className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80"
                            >

                                <Link href={`/nursery-group/${group.slug}`}>
                                <img src={group.cardImage || group.logo || '/images/nursery-1.png'} alt={group.name} className="w-full h-full object-cover rounded-xl" />
                                </Link>
                                <div className="absolute top-60 left-0 right-0 px-4 py-6 mx-4 shadow-lg bg-white rounded-lg">
                                    <h3 className="font-heading text-[24px] font-medium text-[#044A55]">{group.name}</h3>
                                    {group.description && (
                                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{group.description}</p>
                                    )}
               
                                <Link href={`/nursery-group/${group.slug}`}>
                                    <div className='mt-4 flex items-center gap-2 pt-2'>
                                        <span className='text-secondary font-heading text-[20px] uppercase'>VIEW GROUP</span>
                                        <ArrowRight className='text-secondary size-5' />
                                    </div>
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-20">
                            <p className="text-gray-500 text-lg">No nursery groups found matching your search.</p>
                        </div>
                    )}
                </div>

            </div>
        </>
    )
}

export default nurseryGroup
