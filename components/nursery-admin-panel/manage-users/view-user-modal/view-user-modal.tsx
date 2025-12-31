"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ViewUserModal({ open, onClose, user }: any) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">ID</p>
              <p className="text-base font-semibold">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="text-base font-semibold">{user.role}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <p className="text-sm font-medium text-gray-500">Full Name</p>
            <p className="text-base font-semibold">{user.firstName} {user.lastName}</p>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-base">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-base">{user.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-base">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    user.isOnline
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.isOnline ? "Online" : "Offline"}
                </span>
              </p>
            </div>
             <div>
              <p className="text-sm font-medium text-gray-500">Joined Date</p>
              <p className="text-base">{new Date(user.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
           
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
