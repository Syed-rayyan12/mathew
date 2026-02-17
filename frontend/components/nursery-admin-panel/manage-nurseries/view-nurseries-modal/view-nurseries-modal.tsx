"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewNurseriesModalProps {
  open: boolean;
  nursery: any;
  onClose: () => void;
}

export default function ViewNurseriesModal({
  open,
  nursery,
  onClose,
}: ViewNurseriesModalProps) {
  if (!nursery) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-secondary">
            Nursery Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nursery Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Nursery Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nursery ID</label>
                <p className="text-base text-gray-900">{nursery.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Nursery Name</label>
                <p className="text-base text-gray-900">{nursery.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Group</label>
                <p className="text-base text-gray-900">{nursery.groupName || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">City</label>
                <p className="text-base text-gray-900">{nursery.city || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Town</label>
                <p className="text-base text-gray-900">{nursery.town || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Postcode</label>
                <p className="text-base text-gray-900">{nursery.postcode || 'N/A'}</p>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-base text-gray-900">{nursery.address || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Average Rating</label>
                <p className="text-base text-gray-900">
                  {nursery.averageRating ? nursery.averageRating.toFixed(1) : '0.0'} ⭐
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Reviews Count</label>
                <p className="text-base text-gray-900">{nursery.reviewsCount || 0}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      nursery.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {nursery.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Verified</label>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      nursery.isVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {nursery.isVerified ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Owner Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Owner Name</label>
                <p className="text-base text-gray-900">
                  {nursery.ownerFirstName && nursery.ownerLastName
                    ? `${nursery.ownerFirstName} ${nursery.ownerLastName}`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Owner Email</label>
                <p className="text-base text-gray-900">{nursery.ownerEmail || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Owner Phone</label>
                <p className="text-base text-gray-900">{nursery.ownerPhone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(nursery.description || nursery.website || nursery.phoneNumber || nursery.email) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Contact & Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {nursery.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-base text-gray-900">{nursery.email}</p>
                  </div>
                )}

                {nursery.phoneNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-base text-gray-900">{nursery.phoneNumber}</p>
                  </div>
                )}

                {nursery.website && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Website</label>
                    <p className="text-base text-gray-900">{nursery.website}</p>
                  </div>
                )}

                {nursery.description && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-base text-gray-900">{nursery.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {(nursery.createdAt || nursery.updatedAt) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Additional Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {nursery.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created At</label>
                    <p className="text-base text-gray-900">
                      {new Date(nursery.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {nursery.updatedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-base text-gray-900">
                      {new Date(nursery.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
