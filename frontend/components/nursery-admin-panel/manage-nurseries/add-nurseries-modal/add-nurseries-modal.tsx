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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function AddNurseryModal({ open, onClose, onAdd }: any) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    group: "",
    town: "",
    city: "",
    reviews: "",
    status: "",
    lastUpdated: "",
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
      group: "",
      town: "",
      city: "",
      reviews: "",
      status: "",
      lastUpdated: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="font-sans bg-white rounded-xl overflow-y-auto max-h-[90vh] max-w-2xl ">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold font-sans">
            Add New Nursery
          </DialogTitle>
        </div>

        {/* Body */}
        <div className="px-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nursery ID</label>
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
            <label className="text-sm font-medium">Group</label>
            <Input
              name="group"
              placeholder="Enter group"
              value={form.group}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Town</label>
            <Input
              name="town"
              placeholder="Enter town"
              value={form.town}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">City</label>
            <Input
              name="city"
              placeholder="Enter city"
              value={form.city}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Reviews</label>
            <Input
              name="reviews"
              placeholder="Enter reviews"
              value={form.reviews}
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
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Last Updated</label>
            <Input
              name="lastUpdated"
              type="date"
              value={form.lastUpdated}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-secondary" variant="ghost" onClick={handleSubmit}>
            Create Nursery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
