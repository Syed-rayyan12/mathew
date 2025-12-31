"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function EditUserModal({ open, onClose, user, onUpdate }: any) {
  if (!user) return null;

  const [formData, setFormData] = React.useState({
    id: "",
    name: "",
    role: "",
    email: "",
    joined: "",
    status: "active",
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        id: user.id || "",
        name: user.name || "",
        role: user.role || "",
        email: user.email || "",
        joined: user.joined || "",
        status: user.status || "active",
      });
    }
  }, [user]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    onUpdate(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className=" max-w-md max-h-[90vh] overflow-y-auto">
         <div className="flex items-center justify-between px-6 py-4 border-b">
                 <DialogTitle className="text-lg font-semibold font-sans">
                   Edit User
                 </DialogTitle>
       
                 {/* ONE clean close button */}
                
               </div>

        <div className="space-y-4 px-6">

          {/* ID (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ID</label>
            <Input value={formData.id} disabled />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter name"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Input
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              placeholder="Enter role"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter email"
            />
          </div>

          {/* Joined date (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Joined</label>
            <Input value={formData.joined} disabled />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter className="mt-6 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-secondary cursor-pointer" variant="ghost" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
