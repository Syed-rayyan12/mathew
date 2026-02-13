"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Filter, ChevronDown, ArrowRight, Search, X, LocateIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { nurseryService, Nursery } from "@/lib/api/nursery";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function NurseriesPage() {
  const searchParams = useSearchParams();
  const cityFromUrl = searchParams.get('city') || '';
  const [searchQuery, setSearchQuery] = useState("");
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter states
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    fetchNurseries();
  }, [selectedAgeGroups, selectedCareTypes, selectedFacilities, selectedServices, cityFromUrl]);

  const fetchNurseries = async () => {
    setLoading(true);
    try {
      const response = await nurseryService.getAll({ 
        limit: 100,
        city: cityFromUrl || undefined,
        ageRange: selectedAgeGroups,
        careTypes: selectedCareTypes,
        facilities: selectedFacilities,
        services: selectedServices,
      });
      if (response.success && Array.isArray(response.data)) {
        // Only show child nurseries (not parent groups)
        let childNurseries = response.data.filter(n => n.groupId !== null && n.groupId !== undefined);
        
        // If city/town is searched, filter by exact city or town match
        if (cityFromUrl) {
          childNurseries = childNurseries.filter(n => 
            n.city?.toLowerCase() === cityFromUrl.toLowerCase() ||
            n.town?.toLowerCase() === cityFromUrl.toLowerCase()
          );
        }
        
        console.log('Filtered child nurseries:', childNurseries);
        setNurseries(childNurseries);
      }
    } catch (error) {
      console.error('Failed to fetch nurseries:', error);
      toast.error('Failed to load nurseries');
    } finally {
      setLoading(false);
    }
  };

  const handleAgeGroupChange = (ageGroup: string) => {
    setSelectedAgeGroups(prev =>
      prev.includes(ageGroup)
        ? prev.filter(a => a !== ageGroup)
        : [...prev, ageGroup]
    );
  };

  const handleCareTypeChange = (careType: string) => {
    setSelectedCareTypes(prev =>
      prev.includes(careType)
        ? prev.filter(c => c !== careType)
        : [...prev, careType]
    );
  };

  const handleFacilityChange = (facility: string) => {
    setSelectedFacilities(prev =>
      prev.includes(facility)
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  const handleServiceChange = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const clearFilters = () => {
    setSelectedAgeGroups([]);
    setSelectedCareTypes([]);
    setSelectedFacilities([]);
    setSelectedServices([]);
    setIsFilterOpen(false);
  };

  const filteredNurseries = nurseries.filter(nursery =>
    nursery.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter content component for reusability
  const FilterContent = () => (
    <div className="p-5">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Filter size={18} /> Filters
      </h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">AGE GROUP</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedAgeGroups.includes('0-2 years')}
              onChange={() => handleAgeGroupChange('0-2 years')}
            /> 0–2 years
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedAgeGroups.includes('2-3 years')}
              onChange={() => handleAgeGroupChange('2-3 years')}
            /> 2–3 years
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedAgeGroups.includes('3-5 years')}
              onChange={() => handleAgeGroupChange('3-5 years')}
            /> 3–5 years
          </label>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">CARE TYPE</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('Daycare')}
              onChange={() => handleCareTypeChange('Daycare')}
            /> Daycare
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('Holiday Club')}
              onChange={() => handleCareTypeChange('Holiday Club')}
            /> Holiday Club
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('Key Worker Childcare')}
              onChange={() => handleCareTypeChange('Key Worker Childcare')}
            /> Key Worker Childcare
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('Pre-School')}
              onChange={() => handleCareTypeChange('Pre-School')}
            /> Pre-School
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('2 Year Old Funded Childcare')}
              onChange={() => handleCareTypeChange('2 Year Old Funded Childcare')}
            /> 2 Year Old Funded Childcare
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('9 Months Old Funded Childcare')}
              onChange={() => handleCareTypeChange('9 Months Old Funded Childcare')}
            /> 9 Months Old Funded Childcare
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('After School Care')}
              onChange={() => handleCareTypeChange('After School Care')}
            /> After School Care
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('3 and 4 Year Old Funded Childcare')}
              onChange={() => handleCareTypeChange('3 and 4 Year Old Funded Childcare')}
            /> 3 and 4 Year Old Funded Childcare
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedCareTypes.includes('Before School Care')}
              onChange={() => handleCareTypeChange('Before School Care')}
            /> Before School Care
          </label>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">FACILITIES</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedFacilities.includes('Outdoor Play Area')}
              onChange={() => handleFacilityChange('Outdoor Play Area')}
            /> Outdoor Play Area
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedFacilities.includes('Hot Meals')}
              onChange={() => handleFacilityChange('Hot Meals')}
            /> Hot Meals
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedFacilities.includes('CCTV')}
              onChange={() => handleFacilityChange('CCTV')}
            /> CCTV
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedFacilities.includes('Extended Hours')}
              onChange={() => handleFacilityChange('Extended Hours')}
            /> Extended Hours
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedFacilities.includes('SEND Support')}
              onChange={() => handleFacilityChange('SEND Support')}
            /> SEND Support
          </label>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">SERVICES</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedServices.includes('Ofsted Registered')}
              onChange={() => handleServiceChange('Ofsted Registered')}
            /> Ofsted Registered
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedServices.includes('Tax-Free Childcare')}
              onChange={() => handleServiceChange('Tax-Free Childcare')}
            /> Tax-Free Childcare
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selectedServices.includes('Available Space')}
              onChange={() => handleServiceChange('Available Space')}
            /> Available Space
          </label>
        </div>
      </div>

      <button 
        onClick={clearFilters}
        className="w-full mt-3 text-sm text-gray-500 hover:underline"
      >
        Clear All Filters
      </button>
    </div>
  );

  return (
    <>
    <div className="pt-24 bg-white px-4 md:px-12 lg:px-24">
   
     <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white gap-4">
      <div>

        <h2 className="font-medium text-xl md:text-[28px]"><span className="text-secondary">({filteredNurseries.length.toString().padStart(2, '0')})</span> NURSERIES FOUND</h2>
         <span className="text-gray-600 text-sm">Showing 1-{filteredNurseries.length} of {nurseries.length} results</span>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* Mobile Filter Button */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden flex items-center gap-2">
              <Filter size={16} /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Nurseries</SheetTitle>
              <SheetDescription>
                Filter by age group, care type, facilities, and services
              </SheetDescription>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>

        <div className="relative flex-1 md:flex-initial">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search nurseries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full md:w-64"
          />
        </div>
      </div>
      </div>
       <Separator className="mt-4"/>
    </div>
   
    <div className="w-full grid grid-cols-1 bg-white lg:grid-cols-4 bg-white gap-8 px-4 md:px-12 lg:px-24 py-6">

      

      {/* LEFT FILTER SIDEBAR - Desktop Only */}
      <aside className="col-span-1 hidden lg:block bg-white shadow rounded-2xl h-fit top-10 border border-gray-200">
        <FilterContent />
      </aside>

     

      {/* RIGHT CONTENT AREA */}
      <section className="col-span-1 lg:col-span-3">


        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-22 pb-20 md:pb-40 bg-white">
          {loading ? (
            <div className="col-span-2 text-center py-20">
              <p className="text-gray-500 text-lg">Loading nurseries...</p>
            </div>
          ) : filteredNurseries.length > 0 ? (
            filteredNurseries.map((nursery, index) => (
              <div
                key={nursery.id}
                className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80 md:h-96"
              >
                <Link href={`/products/${nursery.slug}`}>
                  <img 
                    src={nursery.cardImage || nursery.images?.[0] || '/images/nursery-1.png'} 
                    alt={nursery.name} 
                    className="w-full h-full object-cover rounded-xl cursor-pointer" 
                  />
                </Link>
                <div className="absolute top-52 md:top-60 left-0 right-0 px-3 md:px-4 py-4 md:py-6 mx-3 md:mx-4 shadow-lg bg-white rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading text-lg md:text-[24px] font-medium text-[#044A55]">{nursery.name}</h3>
                    {(nursery.city || nursery.town) && (
                      <span className="text-xs md:text-sm font-ubuntu flex items-center gap-1 text-foreground whitespace-nowrap">
                        <LocateIcon className='text-secondary' size={16}/>
                        {[nursery.town, nursery.city].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-2 mt-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star 
                        key={i} 
                        className={i < Math.round(nursery.averageRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} 
                        size={14} 
                      />
                    ))}
                    <span className="text-xs md:text-sm ml-2 text-foreground">{nursery.reviewCount || 0} reviews</span>
                  </div>
                  <p className="font-ubuntu text-xs md:text-[14px] text-muted-foreground line-clamp-2">{nursery.description || 'Quality childcare and early learning'}
                  </p>
                  <Link href={`/products/${nursery.slug}`}>
                    <div className='mt-2 md:mt-4 flex items-center pt-2 cursor-pointer'>
                      <Button className='text-secondary bg-transparent cursor-pointer hover:bg-transparent font-heading text-base md:text-[20px] uppercase px-2'>VIEW NURSERY</Button>
                      <ArrowRight className='text-secondary size-5' />
                    </div>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-20">
              <p className="text-gray-500 text-lg">No nurseries found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
     </>
  );
}