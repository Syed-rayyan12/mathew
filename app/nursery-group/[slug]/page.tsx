'use client'

import React, { use, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Link as LinkIcon, Star } from "lucide-react";
import Link from "next/link";
import MiniNav from "@/components/landing-page/little-nav";
import Header from "@/components/landing-page/header";
import Footer from "@/components/landing-page/footer";
import { Nursery, nurseryService } from "@/lib/api/nursery";
import { NurseryGroup, nurseryGroupService } from "@/lib/api/nursery-group";
import Image from "next/image";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function NurseryGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [group, setGroup] = useState<NurseryGroup | null>(null);
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [loading, setLoading] = useState(true);
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    const fetchGroupAndNurseries = async () => {
      try {
        console.log('Fetching group with slug:', resolvedParams.slug);
        
        // Fetch group details using getGroupBySlug API
        const groupResponse = await nurseryGroupService.getGroupBySlug(resolvedParams.slug);
        
        console.log('Group response:', groupResponse);
        
        if (groupResponse.success && groupResponse.data) {
          setGroup(groupResponse.data);
          
          // Fetch all nurseries and filter by groupId
          const nurseriesResponse = await nurseryService.getAll({ limit: 100 });
          
          if (nurseriesResponse.success && Array.isArray(nurseriesResponse.data)) {
            // Filter nurseries that have this group's ID as their groupId
            const groupNurseries = nurseriesResponse.data.filter(
              (nursery: any) => nursery.groupId === groupResponse.data.id
            );
            console.log('Child nurseries:', groupNurseries);
            setNurseries(groupNurseries);
          }
        }
      } catch (error) {
        console.error('Error fetching nursery group:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupAndNurseries();
  }, [resolvedParams.slug]);

  if (loading) {
    return (
      <>
        <MiniNav />
        <Header />
        <div className="w-full mx-auto py-10 px-24 shadow-xl bg-white">
          <p className="text-center text-gray-500">Loading group...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!group) {
    return (
      <>
        <MiniNav />
        <Header />
        <div className="w-full mx-auto py-10 px-24 shadow-xl bg-white">
          <p className="text-center text-gray-500">Nursery not found</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <MiniNav />
      <Header />
      <div className="w-full mx-auto py-6 md:py-10 px-4 md:px-12 lg:px-24 shadow-xl bg-white">
        {/* HEADER SECTION */}
        <div className="bg-white p-3 md:p-4 rounded-[6px] shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <div className="flex  md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-[48px] font-bold text-[#1F2937] font-medium">{group.name.toUpperCase()}</h2>
              {/* <p className="text-gray-700 mb-2">{group.city || ''} {group.postcode || ''}</p>
              <p className="text-gray-600">{group.phone || ''}</p>
              <p className="text-gray-600">{group.email || ''}</p> */}
            </div>
            <div>
              <div className="rounded-md overflow-hidden">
                <Image 
                  src={group.logo || "/images/group-1.png"} 
                  alt={`${group.name} logo`}
                  width={120}
                  height={120}
                  className="object-contain md:w-[150px] md:h-[150px]"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            {/* <button 
              onClick={() => swiperRef.current?.slidePrev()}
              className="bg-secondary hover:bg-secondary/90 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button 
              onClick={() => swiperRef.current?.slideNext()}
              className="bg-secondary hover:bg-secondary/90 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button> */}
          </div>
          {/* IMAGES SLIDER */}
          <div className="mb-4 md:mb-6">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={12}
              slidesPerView={1}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                },
                1024: {
                  slidesPerView: 2,
                },
              }}
              onSwiper={(swiper) => (swiperRef.current = swiper)}
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              className="rounded-lg nursery-slider pb-12"
              style={{
                '--swiper-navigation-color': '#ffffff',
                '--swiper-pagination-color': '#044A55',
              } as React.CSSProperties}
            >
              {group.images && group.images.length > 0 ? (
                group.images.map((image: string, index: number) => (
                  <SwiperSlide key={index}>
                    <img
                      src={image}
                      className="h-56 md:h-80 lg:h-96 w-full object-cover rounded-lg"
                      alt={`${group.name} - Image ${index + 1}`}
                    />
                  </SwiperSlide>
                ))
              ) : (
                <>
                  <SwiperSlide>
                    <img
                      src={group.cardImage || group.logo || "/images/group-1.png"}
                      className="h-56 md:h-80 lg:h-96 w-full object-cover rounded-lg"
                      alt={group.name}
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                      src="/images/group-2.png"
                      className="h-56 md:h-80 lg:h-96 w-full object-cover rounded-lg"
                      alt={`${group.name} - Image 2`}
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                      src="/images/group-3.png"
                      className="h-56 md:h-80 lg:h-96 w-full object-cover rounded-lg"
                      alt={`${group.name} - Image 3`}
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <img
                      src="/images/group-4.png"
                      className="h-56 md:h-80 lg:h-96 w-full object-cover rounded-lg"
                      alt={`${group.name} - Image 4`}
                    />
                  </SwiperSlide>
                </>
              )}
            </Swiper>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* LEFT MAIN CONTENT */}
          <div className="col-span-1 lg:col-span-2 bg-white overflow-hidden mt-6 md:mt-10 px-3 md:px-4 pt-3 pb-10 md:pb-20 shadow-[0px_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] rounded-[6px]">
            <h2 className="text-xl md:text-2xl lg:text-[34px] font-bold text-[#1F2937] font-medium">About {group.name}</h2>
            <p className="font-medium text-sm md:text-base font-sans text-muted-foreground mb-6 md:mb-8">
              {group.aboutUs || 'A trusted nursery group providing quality childcare and early years education.'}
            </p>
          </div>

          {/* RIGHT CONTACT CARD */}
          <div className="p-3 md:p-4 rounded-[6px] border-none shadow-[0_4px_4px_4px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] mt-6 md:mt-10 h-fit lg:sticky lg:top-10">
            <h2 className="text-xl md:text-2xl lg:text-[32px] font-medium mb-3 md:mb-4 font-heading border-b pb-2">Contact Our Group</h2>
            <p className="font-medium text-xs md:text-sm font-sans text-muted-foreground">123 HGet in touch to learn more about our nurseries or to arrange visits across multiple locations.</p>
            <div className="flex flex-col items-center gap-2">
              <Button className="mt-4 md:mt-5 w-full bg-primary hover:bg-blue-600 rounded-[6px] hover:text-primary hover:bg-transparent cursor-pointer border-2 border-primary transition-all duration-300 text-sm md:text-base py-5">
                Book Group Visit
              </Button>
              <Button className="mt-4 md:mt-5 w-full bg-primary hover:bg-blue-600 rounded-[6px] hover:text-primary hover:bg-transparent cursor-pointer border-2 border-primary transition-all duration-300 text-sm md:text-base py-5">
                Download Brochure
              </Button>
            </div>
          </div>

        </div>

        <div className="pt-10 md:pt-20 pb-20 md:pb-40">
          <h2 className="text-xl md:text-2xl lg:text-[34px] font-bold text-[#1F2937] font-medium mb-6 md:mb-8">Our Nurseries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {nurseries && nurseries.length > 0 ? (
              nurseries.map((nursery: any) => (
                <div
                  key={nursery.id}
                  className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-72 md:h-80"
                >
                  <Link href={`/products/${nursery.slug}`}>
                    <img src={nursery.cardImage || nursery.images?.[0] || '/images/nursery-1.png'} alt={nursery.name} className="w-full h-full object-cover rounded-xl" />
                  </Link>

                  <div className="absolute top-52 md:top-60 left-0 right-0 px-3 md:px-4 py-4 md:py-6 mx-3 md:mx-4 shadow-lg bg-white rounded-lg">
                    <h3 className="font-heading text-lg md:text-[24px] font-medium text-[#044A55]">{nursery.name}</h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{nursery.city}</p>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star 
                          key={i} 
                          className={i < Math.round(nursery.averageRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} 
                          size={14} 
                        />
                      ))}
                      <span className="text-xs md:text-sm ml-2 text-foreground">{nursery.reviewCount || 0} reviews</span>
                    </div>

                    <Link href={`/profile?slug=${nursery.slug}`}>
                      <div className='mt-2 md:mt-4 flex items-center pt-2'>
                        <Button className='text-secondary bg-transparent hover:bg-transparent cursor-pointer font-heading text-base md:text-[20px] uppercase px-2'>View Nursery</Button>
                        <ArrowRight className='text-secondary size-5' />
                      </div>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10">
                <p className="text-gray-500 text-sm md:text-base">No nurseries in this group yet.</p>
              </div>
            )}
          </div>
        </div>




      </div>
      <Footer />
    </>
  );
} 