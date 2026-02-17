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
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/api/admin";

export default function EditNurseryAdminModal({ open, nursery, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    ageGroup: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    town: "",
    postcode: "",
    aboutUs: "",
    philosophy: "",
    videoUrl: "",
    logo: "",
    cardImage: "",
    capacity: "",
    openingTime: "",
    closingTime: "",
  });

  useEffect(() => {
    if (nursery && open) {
      setFormData({
        name: nursery.name || "",
        ageGroup: nursery.ageRange || "",
        email: nursery.email || "",
        phone: nursery.phone || nursery.phoneNumber || "",
        address: nursery.address || "",
        city: nursery.city || "",
        town: nursery.town || "",
        postcode: nursery.postcode || "",
        aboutUs: nursery.aboutUs || "",
        philosophy: nursery.philosophy || "",
        videoUrl: nursery.videoUrl || "",
        logo: nursery.logo || "",
        cardImage: nursery.cardImage || "",
        capacity: nursery.capacity?.toString() || "",
        openingTime: nursery.openingHours?.openingTime || "",
        closingTime: nursery.openingHours?.closingTime || "",
      });

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

      const response = await adminService.updateNursery(nursery.id, {
        name: formData.name,
        ageRange: formData.ageGroup,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        town: formData.town || undefined,
        postcode: formData.postcode,
        aboutUs: formData.aboutUs,
        philosophy: formData.philosophy,
        videoUrl: formData.videoUrl,
        logo: formData.logo,
        cardImage: formData.cardImage,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        facilities: allFacilities,
        openingHours: (formData.openingTime || formData.closingTime) ? {
          openingTime: formData.openingTime,
          closingTime: formData.closingTime,
        } : undefined,
      });

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
      <DialogContent className="max-w-4xl w-[95%] overflow-y-auto p-4 max-h-[90vh]">
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
              <div>
                <Label className="block mb-2">Capacity (Children)</Label>
                <Input
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <Label className="block mb-2">Logo URL</Label>
                <Input
                  name="logo"
                  value={formData.logo}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <Label className="block mb-2">Card Image URL</Label>
                <Input
                  name="cardImage"
                  value={formData.cardImage}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="font-medium text-lg mb-4">Address Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="block mb-2">Address</Label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </div>
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
                <Label className="block mb-2">Town (Optional)</Label>
                <Input
                  name="town"
                  value={formData.town}
                  onChange={handleChange}
                  placeholder="Enter town"
                />
              </div>
              <div>
                <Label className="block mb-2">Postcode</Label>
                <Input
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleChange}
                  placeholder="e.g., SW1A 1AA"
                />
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="font-medium text-lg mb-4">Opening Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">Opening Time</Label>
                <Input
                  name="openingTime"
                  type="time"
                  value={formData.openingTime}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label className="block mb-2">Closing Time</Label>
                <Input
                  name="closingTime"
                  type="time"
                  value={formData.closingTime}
                  onChange={handleChange}
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

          {/* Video URL */}
          <div>
            <h3 className="font-medium text-lg mb-4">Video</h3>
            <div>
              <Label className="block mb-2">Video URL</Label>
              <Input
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
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
