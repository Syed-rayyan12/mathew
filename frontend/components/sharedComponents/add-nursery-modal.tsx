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
import { Plus, X, Upload, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { nurseryDashboardService } from "@/lib/api/nursery";
import { authService } from "@/lib/api/auth";

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
  const [locationLoading, setLocationLoading] = useState(false);
  const [cardImagePreview, setCardImagePreview] = useState<string>('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [facilities, setFacilities] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    nurseryName: "",
    ageGroup: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
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

  // Load user data and parse address on mount or when dialog opens
  useEffect(() => {
    if (open) {
      const user = authService.getCurrentUser();
      if (user?.address) {
        parseAddress(user.address);
      }
    }
  }, [open]);

  // Parse address from nominatim API response object
  const parseAddress = (addressData: any) => {
    let address = '';
    let city = '';
    let postcode = '';

    // Extract address (combination of house_number and road)
    if (addressData.house_number && addressData.road) {
      address = `${addressData.house_number} ${addressData.road}`;
    } else if (addressData.road) {
      address = addressData.road;
    } else if (addressData.display_name) {
      // Fallback to first part of display_name if no road data
      const parts = addressData.display_name.split(',');
      address = parts[0] || '';
    }

    // Extract city (try multiple field names used by nominatim)
    city = addressData.city || addressData.town || addressData.suburb || '';

    // Extract postcode
    postcode = addressData.postcode || '';

    setFormData(prev => ({
      ...prev,
      address: address || prev.address,
      city: city || prev.city,
      postcode: postcode || prev.postcode
    }));
  };

const getLocation = async () => {
  // Prevent double clicks
  if (locationLoading) return;

  setLocationLoading(true);

  // Browser support check
  if (!navigator.geolocation) {
    toast.error('Geolocation is not supported by your browser');
    setLocationLoading(false);
    return;
  }

  // Permission pre-check (Chrome / Edge)
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        toast.error('Location permission is denied. Please enable it in browser settings.');
        setLocationLoading(false);
        return;
      }
    }
  } catch (err) {
    // Safari fallback – ignore
  }

  toast.info('Fetching your current location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        // Reverse geocoding (OpenStreetMap)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MathewNursery/1.0'
            }
          }
        );

        if (!response.ok) throw new Error('Reverse geocoding failed');

        const data = await response.json();

        // UK validation (optional but recommended)
        // if (data.address?.country_code !== 'gb') {
        //   toast.error('Please select a UK location');
        //   setLocationLoading(false);
        //   return;
        // }

        if (data.display_name) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name,
            latitude,
            longitude
          }));

          toast.success('Location fetched successfully!');
        } else {
          toast.warning('Address not found. Please enter manually.');
        }
      } catch (error) {
        console.error('Location error:', error);
        toast.error('Unable to fetch address. Please enter it manually.');
      } finally {
        setLocationLoading(false);
      }
    },
    (error) => {
      let message = 'Unable to access location. ';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message += 'Please allow location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          message += 'Location unavailable.';
          break;
        case error.TIMEOUT:
          message += 'Location request timed out.';
          break;
        default:
          message += 'Please enter address manually.';
      }

      toast.error(message);
      setLocationLoading(false);
    },
    {
      enableHighAccuracy: false, // 🔥 IMPORTANT
      timeout: 15000,
      maximumAge: 30000
    }
  );
};

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
    if (!formData.nurseryName || !formData.address || !formData.city || !formData.postcode) {
      toast.error('Please fill in all required fields');
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

      const response = await nurseryDashboardService.createNursery({
        name: formData.nurseryName,
        ageRange: formData.ageGroup,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postcode: formData.postcode,
        aboutUs: formData.aboutUs,
        philosophy: formData.philosophy,
        videoUrl: formData.videoUrl,
        cardImage: cardImagePreview,
        images: imagePreviews.filter(img => img !== ''),
        facilities: facilities.filter(f => f.trim() !== ''),
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
          address: "",
          city: "",
          postcode: "",
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

          {/* Address */}
          <div>
            <h3 className="font-medium text-lg mb-4 flex items-center justify-between">
              <span>Address</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getLocation}
                disabled={locationLoading}
                className="text-xs"
              >
                <MapPin className={`h-4 w-4 mr-1 ${locationLoading ? 'animate-pulse' : ''}`} />
                {locationLoading ? 'Getting Location...' : 'Use My Location'}
              </Button>
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="block mb-2">Street Address *</Label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 High Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block mb-2">City *</Label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="London"
                  />
                </div>
                <div>
                  <Label className="block mb-2">Postcode *</Label>
                  <Input
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    placeholder="SW1A 1AA"
                  />
                </div>
              </div>
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
