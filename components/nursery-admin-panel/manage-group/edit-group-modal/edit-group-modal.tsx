"use client";

import React, { useState, useEffect } from "react";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function EditGroupModal({ open, onClose, group, onUpdate }: any) {
  const [formData, setFormData] = useState({
    id: "",
    groupName: "",
    owner: "",
    email: "",
    Nurseries: "",
    status: "Active",
    plan: "Basic",
  });

  // Populate form when group data changes
  useEffect(() => {
    if (group) {
      setFormData({
        id: group.id || "",
        groupName: group.groupName || "",
        owner: group.owner || "",
        email: group.email || "",
        Nurseries: group.Nurseries || "",
        status: group.status || "Active",
        plan: group.plan || "Basic",
      });
    }
  }, [group]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh] font-sans bg-white rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold font-sans">
            Edit Group
          </DialogTitle>
        </div>

        <div className="flex flex-col gap-4 mt-4 px-6">
          {/* ID (Read-only) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">ID</label>
            <Input
              value={formData.id}
              readOnly
              className="cursor-not-allowed opacity-70"
              placeholder="Group ID"
            />
          </div>

          {/* Group Name */}
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

          {/* Nurseries (Number Input) */}
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
          <Button className="cursor-pointer bg-secondary" variant="ghost" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
