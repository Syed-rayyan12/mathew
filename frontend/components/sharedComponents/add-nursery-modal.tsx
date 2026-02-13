"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "../ui/separator";
import { Plus, X, Upload, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { nurseryDashboardService } from "@/lib/api/nursery";
import { authService } from "@/lib/api/auth";
import { UK_CITIES } from "@/lib/data/uk-cities";
import { UK_TOWNS } from "@/lib/data/uk-towns";

export default function AddNurseryModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [townPopoverOpen, setTownPopoverOpen] = useState(false);
  const [cardImagePreview, setCardImagePreview] = useState<string>('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    nurseryName: "",
    ageGroup: "",
    email: "",
    phone: "",
    city: "",
    town: "",
    aboutUs: "",
    philosophy: "",
    videoUrl: "",
    openingTime: "",
    closingTime: "",
    fees0to2Full: "",
    fees0to2Part: "",
    fees2to3Full: "",
    fees2to3Part: "",
    fees3to5Full: "",
    fees3to5Part: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFacilityChange = (index: number, value: string) => {
    const newFacilities = [...facilities];
    newFacilities[index] = value;
    setFacilities(newFacilities);
  };

  const addFacility = () => {
    setFacilities([...facilities, '']);
  };

  const removeFacility = (index: number) => {
    const newFacilities = facilities.filter((_, i) => i !== index);
    setFacilities(newFacilities);
  };

  const toggleCareType = (careType: string) => {
    setCareTypes(prev => 
      prev.includes(careType) 
        ? prev.filter(ct => ct !== careType)
        : [...prev, careType]
    );
  };

  const toggleService = (service: string) => {
    setServices(prev => 
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleMultipleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const newPreviews: string[] = [];

      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === fileArray.length) {
            setImagePreviews([...imagePreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!formData.nurseryName || !formData.city) {
      toast.error('Please fill in nursery name and city/town');
      return;
    }

    setLoading(true);
    try {
      const fees = {
        '0-2 years': {
          fullTime: formData.fees0to2Full,
          partTime: formData.fees0to2Part,
        },
        '2-3 years': {
          fullTime: formData.fees2to3Full,
          partTime: formData.fees2to3Part,
        },
        '3-5 years': {
          fullTime: formData.fees3to5Full,
          partTime: formData.fees3to5Part,
        },
      };

      const openingHours = {
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
      };

      // Combine care types, services, and facilities into one array
      const allFacilities = [
        ...careTypes,
        ...services,
        ...facilities.filter(f => f.trim() !== '')
      ];

      const response = await nurseryDashboardService.createNursery({
        name: formData.nurseryName,
        ageRange: formData.ageGroup,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        town: formData.town || undefined,
        aboutUs: formData.aboutUs,
        philosophy: formData.philosophy,
        videoUrl: formData.videoUrl,
        cardImage: cardImagePreview,
        images: imagePreviews.filter(img => img !== ''),
        facilities: allFacilities,
        fees,
        openingHours,
      });

      console.log('Create nursery API response:', response);
      
      if (response.success) {
        console.log('Nursery created successfully:', response.data);
        toast.success('Nursery created successfully!');
        
        // Reset form
        setFormData({
          nurseryName: "",
          ageGroup: "",
          email: "",
          phone: "",
          city: "",
          town: "",
          aboutUs: "",
          philosophy: "",
          videoUrl: "",
          openingTime: "",
          closingTime: "",
          fees0to2Full: "",
          fees0to2Part: "",
          fees2to3Full: "",
          fees2to3Part: "",
          fees3to5Full: "",
          fees3to5Part: "",
        });
        setCardImagePreview('');
        setImagePreviews([]);
        setVideoPreview('');
        setCareTypes([]);
        setServices([]);
        setFacilities(['']);
        
        onOpenChange(false);
        if (onSuccess) {
          console.log('Calling onSuccess callback');
          onSuccess();
        }
      } else {
        console.error('Nursery creation failed:', response);
        toast.error(response.message || 'Failed to create nursery');
      }
    } catch (error: any) {
      console.error('Error creating nursery:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while creating nursery';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Separator />
      <DialogContent className="max-w-6xl w-[100%] overflow-y-auto p-4 max-h-[90vh]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="font-sans text-xl">Add New Nursery</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-medium text-lg mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">Nursery Name *</Label>
                <Input
                  name="nurseryName"
                  value={formData.nurseryName}
                  onChange={handleChange}
                  placeholder="Enter nursery name"
                />
              </div>
              <div>
                <Label className="block mb-2">Age Group *</Label>
                <select
                  name="ageGroup"
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Age Group</option>
                  <option value="0-2 years">0-2 years</option>
                  <option value="2-3 years">2-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="0-5 years">0-5 years</option>
                </select>
              </div>
              <div>
                <Label className="block mb-2">Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@nursery.com"
                />
              </div>
              <div>
                <Label className="block mb-2">Phone</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 123 456 7890"
                />
              </div>
            </div>
          </div>

          {/* City and Town */}
          <div>
            <h3 className="font-medium text-lg mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City */}
              <div>
                <Label className="block mb-2">City *</Label>
                <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityPopoverOpen}
                      className={cn(
                        "w-full justify-between",
                        !formData.city && "text-muted-foreground"
                      )}
                    >
                      {formData.city || "Select city..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[400px]">
                    <Command>
                      <CommandInput placeholder="Search city..." />
                      <CommandList>
                        <CommandEmpty>No city found.</CommandEmpty>
                        <CommandGroup>
                          {UK_CITIES.map((city) => (
                            <CommandItem
                              key={`city-${city}`}
                              value={city}
                              onSelect={() => {
                                setFormData({ ...formData, city: city });
                                setCityPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.city === city ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {city}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Town */}
              <div>
                <Label className="block mb-2">Town (Optional)</Label>
                <Popover open={townPopoverOpen} onOpenChange={setTownPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={townPopoverOpen}
                      className={cn(
                        "w-full justify-between",
                        !formData.town && "text-muted-foreground"
                      )}
                    >
                      {formData.town || "Select town..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[400px]">
                    <Command>
                      <CommandInput placeholder="Search town..." />
                      <CommandList>
                        <CommandEmpty>No town found.</CommandEmpty>
                        <CommandGroup>
                          {UK_TOWNS.map((town) => (
                            <CommandItem
                              key={`town-${town}`}
                              value={town}
                              onSelect={() => {
                                setFormData({ ...formData, town: town });
                                setTownPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.town === town ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {town}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Care Types */}
          <div>
            <h3 className="font-medium text-lg mb-4">Care Types</h3>
            <p className="text-sm text-muted-foreground mb-4">Select all care types that your nursery provides</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Daycare',
                'Holiday Club',
                'Key Worker Childcare',
                'Pre-School',
                '2 Year Old Funded Childcare',
                '9 Months Old Funded Childcare',
                'After School Care',
                '3 and 4 Year Old Funded Childcare',
                'Before School Care'
              ].map((careType) => (
                <label key={careType} className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={careTypes.includes(careType)}
                    onChange={() => toggleCareType(careType)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{careType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-medium text-lg mb-4">Services</h3>
            <p className="text-sm text-muted-foreground mb-4">Select all services that apply to your nursery</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Ofsted Registered',
                'Tax-Free Childcare',
                'Available Space'
              ].map((service) => (
                <label key={service} className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={services.includes(service)}
                    onChange={() => toggleService(service)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          {/* About & Philosophy */}
          <div>
            <h3 className="font-medium text-lg mb-4">About & Philosophy</h3>
            <div className="space-y-4">
              <div>
                <Label className="block mb-2">About Us</Label>
                <Textarea
                  name="aboutUs"
                  value={formData.aboutUs}
                  onChange={handleChange}
                  placeholder="Describe your nursery"
                  rows={4}
                />
              </div>
              <div>
                <Label className="block mb-2">Philosophy</Label>
                <Textarea
                  name="philosophy"
                  value={formData.philosophy}
                  onChange={handleChange}
                  placeholder="Your educational philosophy"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Card Image Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Card Image</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload a single image that will appear on nursery cards in listings</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
              {cardImagePreview ? (
                <div className="space-y-4">
                  <div className="relative group max-w-md mx-auto">
                    <div className="border-2 border-gray-200 rounded-lg h-48 overflow-hidden">
                      <img
                        src={cardImagePreview}
                        alt="Card Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardImagePreview('')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                    <Upload size={18} />
                    <span>Change Card Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCardImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                  <Upload className="text-gray-400 mb-2" size={48} />
                  <span className="text-lg text-gray-600 mb-1">Upload Card Image</span>
                  <span className="text-sm text-gray-500">Click to select a single image for cards</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCardImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Gallery Images Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Gallery Images</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload multiple images for the slider on your nursery page</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
              {imagePreviews.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="border-2 border-gray-200 rounded-lg h-32 overflow-hidden">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                    <Plus size={18} />
                    <span>Add More Images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleMultipleImageUpload}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                  <Upload className="text-gray-400 mb-2" size={48} />
                  <span className="text-lg text-gray-600 mb-1">Upload Gallery Images</span>
                  <span className="text-sm text-gray-500">Click to select multiple images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleMultipleImageUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Video Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Video</h3>
            <div className="border-2 border-dashed rounded-lg p-6">
              {videoPreview ? (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVideoPreview('')
                        setFormData({ ...formData, videoUrl: '' })
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">
                    <Upload size={18} />
                    <span>Change Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const videoUrl = URL.createObjectURL(file)
                          setVideoPreview(videoUrl)
                          setFormData({ ...formData, videoUrl })
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                  <Upload className="text-gray-400 mb-2" size={48} />
                  <span className="text-lg text-gray-600 mb-1">Upload Video</span>
                  <span className="text-sm text-gray-500">Click to select a video file</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const videoUrl = URL.createObjectURL(file)
                        setVideoPreview(videoUrl)
                        setFormData({ ...formData, videoUrl })
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <h3 className="font-medium text-lg mb-4">Facilities</h3>
            <div className="space-y-2">
              {facilities.map((facility, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={facility}
                    onChange={(e) => handleFacilityChange(index, e.target.value)}
                    placeholder="e.g., Outdoor Play Area"
                  />
                  {facilities.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeFacility(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addFacility}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Facility
              </Button>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="font-medium text-lg mb-4">Opening Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">Opening Time</Label>
                <Input
                  type="time"
                  name="openingTime"
                  value={formData.openingTime}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label className="block mb-2">Closing Time</Label>
                <Input
                  type="time"
                  name="closingTime"
                  value={formData.closingTime}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Fees */}
          <div>
            <h3 className="font-medium text-lg mb-4">Fees Structure</h3>
            <div className="space-y-4">
              <div>
                <Label className="font-medium">0-2 Years</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input
                    name="fees0to2Full"
                    value={formData.fees0to2Full}
                    onChange={handleChange}
                    placeholder="Full Time (£)"
                  />
                  <Input
                    name="fees0to2Part"
                    value={formData.fees0to2Part}
                    onChange={handleChange}
                    placeholder="Part Time (£)"
                  />
                </div>
              </div>
              <div>
                <Label className="font-medium">2-3 Years</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input
                    name="fees2to3Full"
                    value={formData.fees2to3Full}
                    onChange={handleChange}
                    placeholder="Full Time (£)"
                  />
                  <Input
                    name="fees2to3Part"
                    value={formData.fees2to3Part}
                    onChange={handleChange}
                    placeholder="Part Time (£)"
                  />
                </div>
              </div>
              <div>
                <Label className="font-medium">3-5 Years</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input
                    name="fees3to5Full"
                    value={formData.fees3to5Full}
                    onChange={handleChange}
                    placeholder="Full Time (£)"
                  />
                  <Input
                    name="fees3to5Part"
                    value={formData.fees3to5Part}
                    onChange={handleChange}
                    placeholder="Part Time (£)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-secondary hover:bg-secondary/90"
          >
            {loading ? 'Creating...' : 'Create Nursery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
