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
import { toast } from "sonner";
import { adminService } from "@/lib/api/admin";
import { Plus, X, Upload } from "lucide-react";

export default function EditGroupAdminModal({ open, group, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [cardImagePreview, setCardImagePreview] = useState<string>("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    city: "",
    town: "",
    aboutUs: "",
    description: "",
    logo: "",
    cardImage: "",
  });

  useEffect(() => {
    if (group && open) {
      console.log('📝 Loading group data into edit form:', group);
      console.log('🏘️ Town from group:', group.town);
      console.log('🏙️ City from group:', group.city);
      console.log('📊 Group object keys:', Object.keys(group));
      
      // Ensure town and city have string values (not null/undefined)
      const townValue = group.town ?? "";
      const cityValue = group.city ?? "";
      
      const newFormData = {
        name: group.name || "",
        email: group.email || group.ownerEmail || "",
        phone: group.phone || group.ownerPhone || "",
        firstName: group.firstName || group.ownerFirstName || "",
        lastName: group.lastName || group.ownerLastName || "",
        city: cityValue,
        town: townValue,
        aboutUs: group.aboutUs || "",
        description: group.description || "",
        logo: group.logo || "",
        cardImage: group.cardImage || "",
      };
      
      console.log('✅ Setting formData with town:', newFormData.town, '(type:', typeof newFormData.town, ')');
      console.log('✅ Setting formData with city:', newFormData.city, '(type:', typeof newFormData.city, ')');
      console.log('📦 Full formData:', newFormData);
      
      setFormData(newFormData);
      
      // Set image previews from saved data
      if (group.logo) {
        setLogoPreview(group.logo);
      } else {
        setLogoPreview("");
      }
      
      if (group.cardImage) {
        setCardImagePreview(group.cardImage);
      } else {
        setCardImagePreview("");
      }
      
      // Initialize gallery images
      if (group.images && Array.isArray(group.images)) {
        setImages(group.images);
        setImagePreviews(group.images);
      } else {
        setImages([]);
        setImagePreviews([]);
      }
    }
  }, [group, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addImage = () => {
    setImages([...images, '']);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const updateImage = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, logo: base64String });
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

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
            setImages([...images, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    setImages(newPreviews);
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: "" });
    setLogoPreview("");
  };

  const removeCardImagePreview = () => {
    setFormData({ ...formData, cardImage: "" });
    setCardImagePreview("");
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.city) {
      toast.error('Please fill in group name and city');
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.updateGroup(group.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        city: formData.city,
        town: formData.town || undefined,
        aboutUs: formData.aboutUs,
        description: formData.description,
        logo: formData.logo,
        cardImage: formData.cardImage,
        images: images.filter(img => img.trim() !== ''),
      });

      if (response.success) {
        toast.success('Group updated successfully!');
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.message || 'Failed to update group');
      }
    } catch (error: any) {
      console.error('Error updating group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while updating group';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95%] overflow-y-auto p-4 max-h-[90vh]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="font-sans text-xl">Edit Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div>
            <h3 className="font-medium text-lg mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">Group Name *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label className="block mb-2">Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@group.com"
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
                <Label className="block mb-2">First Name</Label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label className="block mb-2">Last Name</Label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Logo</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
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
                <label className="cursor-pointer flex flex-col items-center justify-center h-40">
                  <Upload className="text-gray-400 mb-2" size={40} />
                  <span className="text-lg text-gray-600 mb-1">Upload Logo</span>
                  <span className="text-sm text-gray-500">Click to select an image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Card Image Upload */}
          <div>
            <h3 className="font-medium text-lg mb-4">Card Image</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload a single image that will appear on group cards in listings</p>
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
                      onClick={removeCardImagePreview}
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
            <p className="text-sm text-muted-foreground mb-4">Upload multiple images for the slider on your group page</p>
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

          {/* Location */}
          <div>
            <h3 className="font-medium text-lg mb-4">Location</h3>
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

          {/* About & Description */}
          <div>
            <h3 className="font-medium text-lg mb-4">About & Description</h3>
            <div className="space-y-4">
              <div>
                <Label className="block mb-2">About Us</Label>
                <Textarea
                  name="aboutUs"
                  value={formData.aboutUs}
                  onChange={handleChange}
                  placeholder="Describe the group"
                  rows={4}
                />
              </div>
              <div>
                <Label className="block mb-2">Description</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description"
                  rows={3}
                />
              </div>
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
            {loading ? 'Updating...' : 'Update Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
