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

export default function EditGroupAdminModal({ open, group, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
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
  });

  useEffect(() => {
    if (group && open) {
      setFormData({
        name: group.name || "",
        email: group.email || group.ownerEmail || "",
        phone: group.phone || group.ownerPhone || "",
        firstName: group.firstName || group.ownerFirstName || "",
        lastName: group.lastName || group.ownerLastName || "",
        city: group.city || "",
        town: group.town || "",
        aboutUs: group.aboutUs || "",
        description: group.description || "",
      });
    }
  }, [group, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                <Label className="block mb-2">Town (Optional)</Label>
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
