"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { X } from "lucide-react";

export default function AddUserModal({ open, onClose, onAdd }: any) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    role: "",
    email: "",
    joined: "",
    status: "",
  });

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      }));
    }
  }, [open]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleStatusChange = (value: string) => {
    setForm({ ...form, status: value });
  };

  const handleSubmit = () => {
    onAdd(form);
    onClose();
    setForm({
      id: "",
      name: "",
      role: "",
      email: "",
      joined: "",
      status: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="font-sans bg-white rounded-xl overflow-y-auto max-h-[90vh] max-w-2xl ">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold font-sans">
            Add New User
          </DialogTitle>

          {/* ONE clean close button */}
         
        </div>

        {/* Body */}
        <div className="px-6 space-y-4">

          <div>
            <label className="text-sm font-medium">User ID</label>
            <Input
              name="id"
              readOnly
              value={form.id}
              className="mt-1 cursor-not-allowed opacity-70"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              name="name"
              placeholder="Enter name"
              value={form.name}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <Input
              name="role"
              placeholder="Enter role"
              value={form.role}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              name="email"
              placeholder="Enter email"
              value={form.email}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Joined Date</label>
            <Input
              name="joined"
              type="date"
              value={form.joined}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={form.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="mt-1 w-full">
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

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Cancel
          </Button>

          <Button className="bg-secondary cursor-pointer" variant="ghost" onClick={handleSubmit}>Create User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
