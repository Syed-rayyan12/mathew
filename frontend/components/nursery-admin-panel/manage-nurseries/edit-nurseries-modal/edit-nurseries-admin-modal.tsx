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
import { Plus, X, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/api/admin";
import WeeklyTimings, { getDefaultTimings, parseTimingsFromOpeningHours, formatTimingsForAPI } from "@/components/sharedComponents/weekly-timings";
import type { DayTiming } from "@/components/sharedComponents/weekly-timings";

export default function EditNurseryAdminModal({ open, nursery, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [weeklyTimings, setWeeklyTimings] = useState<DayTiming[]>(getDefaultTimings());
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [cardImagePreview, setCardImagePreview] = useState<string>("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    ageGroup: "",
    email: "",
    phone: "",
    city: "",
    town: "",
    aboutUs: "",
    philosophy: "",
    videoUrl: "",
    cardImage: "",
  });

  useEffect(() => {
    if (nursery && open) {
      console.log('📝 Loading nursery data into edit form:', nursery);
      console.log('🕐 Opening hours from nursery:', nursery.openingHours);
      console.log('🏘️ Town from nursery:', nursery.town);
      console.log('🏙️ City from nursery:', nursery.city);
      
      setFormData({
        name: nursery.name || "",
        ageGroup: nursery.ageRange || "",
        email: nursery.email || "",
        phone: nursery.phone || nursery.phoneNumber || "",
        city: nursery.city || "",
        town: nursery.town || "",
        aboutUs: nursery.aboutUs || "",
        philosophy: nursery.philosophy || "",
        videoUrl: nursery.videoUrl || "",
        cardImage: nursery.cardImage || "",
      });

      console.log('✅ Set town in form:', nursery.town || "");
      console.log('✅ Set city in form:', nursery.city || "");

      // Load weekly timings
      if (nursery.openingHours) {
        const parsedTimings = parseTimingsFromOpeningHours(nursery.openingHours);
        setWeeklyTimings(parsedTimings);
        console.log('🕐 Loaded weekly timings:', parsedTimings);
      } else {
        setWeeklyTimings(getDefaultTimings());
      }

      // Set image previews
      if (nursery.logo) {
        setLogoPreview(nursery.logo);
      } else {
        setLogoPreview("");
      }
      
      if (nursery.cardImage) {
        setCardImagePreview(nursery.cardImage);
      } else {
        setCardImagePreview("");
      }
      
      // Load gallery images
      if (nursery.images && Array.isArray(nursery.images)) {
        setImagePreviews(nursery.images);
      } else {
        setImagePreviews([]);
      }
      
      // Load video
      if (nursery.videoUrl) {
        setVideoPreview(nursery.videoUrl);
      } else {
        setVideoPreview("");
      }

      // Parse facilities into care types, services, and other facilities
      const allFacilities = nursery.facilities || [];
      const careTypeOptions = [
        'Daycare', 'Holiday Club', 'Key Worker Childcare', 'Pre-School',
        '2 Year Old Funded Childcare', '9 Months Old Funded Childcare',
        'After School Care', '3 and 4 Year Old Funded Childcare', 'Before School Care'
      ];
      const serviceOptions = ['Ofsted Registered', 'Tax-Free Childcare', 'Available Space'];
      
      const extractedCareTypes = allFacilities.filter((f: string) => careTypeOptions.includes(f));
      const extractedServices = allFacilities.filter((f: string) => serviceOptions.includes(f));
      const extractedFacilities = allFacilities.filter(
        (f: string) => !careTypeOptions.includes(f) && !serviceOptions.includes(f)
      );

      setCareTypes(extractedCareTypes);
      setServices(extractedServices);
      setFacilities(extractedFacilities.length > 0 ? extractedFacilities : ['']);
    }
  }, [nursery, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  // const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       const base64String = reader.result as string;
  //       setFormData({ ...formData, logo: base64String });
  //       setLogoPreview(base64String);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  const handleCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, cardImage: base64String });
        setCardImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // const removeLogo = () => {
  //   setFormData({ ...formData, logo: "" });
  //   setLogoPreview("");
  // };

  const removeCardImage = () => {
    setFormData({ ...formData, cardImage: "" });
    setCardImagePreview("");
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

  const removeGalleryImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is a video
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a valid video file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, videoUrl: base64String });
        setVideoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeVideo = () => {
    setFormData({ ...formData, videoUrl: "" });
    setVideoPreview("");
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.city) {
      toast.error('Please fill in nursery name and city');
      return;
    }

    setLoading(true);
    try {
      // Combine all facilities
      const allFacilities = [
        ...careTypes,
        ...services,
        ...facilities.filter(f => f.trim() !== '')
      ];

      const updatePayload = {
        name: formData.name,
        ageRange: formData.ageGroup,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        town: formData.town || undefined,
        aboutUs: formData.aboutUs,
        philosophy: formData.philosophy,
        videoUrl: formData.videoUrl,
        // logo: formData.logo,
        cardImage: formData.cardImage,
        images: imagePreviews.filter(img => img.trim() !== ''),
        facilities: allFacilities,
        openingHours: formatTimingsForAPI(weeklyTimings),
      };

      console.log('🕐 Submitting opening hours:', updatePayload.openingHours);
      console.log('📤 Full update payload:', updatePayload);

      const response = await adminService.updateNursery(nursery.id, updatePayload);

      if (response.success) {
        toast.success('Nursery updated successfully!');
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.message || 'Failed to update nursery');
      }
    } catch (error: any) {
      console.error('Error updating nursery:', error);
      const errorMessage = error?.response?.data?.message || error?.message ||  'An error occurred while updating nursery';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95%] overflow-y-auto p-4 max-h-[90vh]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="font-sans text-xl">Edit Nursery</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div>
            <h3 className="font-medium text-lg mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">Nursery Name *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter nursery name"
                />
              </div>
              <div>
                <Label className="block mb-2">Age Group</Label>
                <select
                  name="ageGroup"
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

          {/* Logo Upload */}
          {/* <div>
            <h3 className="font-medium text-lg mb-4">Logo</h3>
            {/* <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
              {logoPreview ? (
                <div className="space-y-4">
                  <div className="relative group max-w-xs mx-auto">
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-32 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                    <Upload size={18} />
                    <span>Change Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>
              ) : (
                // <label className="cursor-pointer flex flex-col items-center justify-center h-40">
                //   <Upload className="text-gray-400 mb-2" size={40} />
                //   <span className="text-lg text-gray-600 mb-1">Upload Logo</span>
                //   <span className="text-sm text-gray-500">Click to select an image</span>
                //   <input
                //     type="file"
                //     accept="image/*"
                //     className="hidden"
                //     onChange={handleLogoUpload}
                //   />
                // </label>
              )}
            </div>
          </div>  */}

          {/* Card Image Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Card Image</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload a single image that will appear on nursery cards in listings</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
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
                      onClick={removeCardImage}
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
                      onChange={handleCardImageUpload}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                  <Upload className="text-gray-400 mb-2" size={48} />
                  <span className="text-lg text-gray-600 mb-1">Upload Card Image</span>
                  <span className="text-sm text-gray-500">Click to select an image for cards</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCardImageUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Gallery Images Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Gallery Images</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload multiple images for the slider on your nursery page</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
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
                          onClick={() => removeGalleryImage(index)}
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
                  <span className="text-lg text-gray-600 mb-1">Upload Images</span>
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

          {/* Location Information */}
          <div>
            <h3 className="font-medium text-lg mb-4">Location Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">City *</Label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label className="block mb-2">Town</Label>
                <Input
                  name="town"
                  value={formData.town}
                  onChange={handleChange}
                  placeholder="Enter town"
                />
              </div>
            </div>
          </div>

          {/* Care Types */}
          <div>
            <h3 className="font-medium text-lg mb-4">Care Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Daycare', 'Holiday Club', 'Key Worker Childcare', 'Pre-School',
                '2 Year Old Funded Childcare', '9 Months Old Funded Childcare',
                'After School Care', '3 and 4 Year Old Funded Childcare', 'Before School Care'
              ].map((careType) => (
                <label key={careType} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Ofsted Registered', 'Tax-Free Childcare', 'Available Space'].map((service) => (
                <label key={service} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
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

          {/* Facilities */}
          <div>
            <h3 className="font-medium text-lg mb-4">Additional Facilities</h3>
            <div className="space-y-2">
              {facilities.map((facility, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={facility}
                    onChange={(e) => handleFacilityChange(index, e.target.value)}
                    placeholder="e.g., Outdoor Play Area, Hot Meals"
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
                  placeholder="Describe the nursery"
                  rows={4}
                />
              </div>
              <div>
                <Label className="block mb-2">Philosophy</Label>
                <Textarea
                  name="philosophy"
                  value={formData.philosophy}
                  onChange={handleChange}
                  placeholder="Educational philosophy"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Weekly Timings */}
          <WeeklyTimings timings={weeklyTimings} onChange={setWeeklyTimings} />

          {/* Video Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Video</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload a video showcasing your nursery</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
              {videoPreview ? (
                <div className="space-y-4">
                  <div className="relative group max-w-2xl mx-auto">
                    <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-black">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full h-64 object-contain"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                    <Upload size={18} />
                    <span>Change Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
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
                    onChange={handleVideoUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-secondary hover:bg-secondary/90"
          >
            {loading ? 'Updating...' : 'Update Nursery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
