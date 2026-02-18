"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export function AddGroupModal({ open, onClose, onAdd }: any) {
  const [formData, setFormData] = useState({
    id:"",
    groupName: "",
    owner: "",
    email: "",
    town: "",
    city: "",
    Nurseries: "",
    status: "Active",
    plan: "Basic",
  });

   useEffect(() => {
      if (open) {
        setFormData((prev) => ({
          ...prev,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        }));
      }
    }, [open]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdd = () => {
    // Generate unique ID (same as Users)
   
    onAdd(formData);
    setFormData({
      id: "",
      groupName: "",
      owner: "",
      email: "",
      town: "",
      city: "",
      Nurseries: "",
      status: "Active",
      plan: "Basic",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className=" max-w-lg overflow-y-auto max-h-[90vh] font-sans bg-white rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
                 <DialogTitle className="text-lg font-semibold font-sans">
                   Add New Group
                 </DialogTitle>
       
                 {/* ONE clean close button */}
                
               </div>
       

        <div className="flex flex-col gap-4 mt-4 px-6">
          {/* Group Name */}

            <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">ID</label>
            <Input
              value={formData.id}
                readOnly
             
              placeholder="Enter group ID"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={formData.groupName}
              onChange={(e) => handleChange("groupName", e.target.value)}
              placeholder="Enter group name"
            />
          </div>

          {/* Owner */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Owner</label>
            <Input
              value={formData.owner}
              onChange={(e) => handleChange("owner", e.target.value)}
              placeholder="Enter owner name"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email</label>
            <Input
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter email"
            />
          </div>

          {/* Town */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Town</label>
            <Input
              value={formData.town}
              onChange={(e) => handleChange("town", e.target.value)}
              placeholder="Enter town"
            />
          </div>

          {/* City */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">City</label>
            <Input
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Enter city"
            />
          </div>

          {/* Nurseries */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Nurseries</label>
            <Input
              type="number"
              value={formData.Nurseries}
              onChange={(e) => handleChange("Nurseries", e.target.value)}
              placeholder="Enter number of nurseries"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plan */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Plan</label>
            <Select
              value={formData.plan}
              onValueChange={(value) => handleChange("plan", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Basic">Basic</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-6 px-6 py-4 border-t">
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Cancel
          </Button>
          <Button className="cursor-pointer" variant="ghost" onClick={handleAdd}>Add Group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
