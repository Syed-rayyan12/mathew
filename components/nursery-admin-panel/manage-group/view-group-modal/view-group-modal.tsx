"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewGroupModalProps {
  open: boolean;
  group: any;
  onClose: () => void;
}

export default function ViewGroupModal({
  open,
  group,
  onClose,
}: ViewGroupModalProps) {
  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium text-secondary">
            Group Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-gray-900 border-b pb-2">
              Group Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Group ID</label>
                <p className="text-base text-gray-900">{group.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Group Name</label>
                <p className="text-base text-gray-900">{group.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">City</label>
                <p className="text-base text-gray-900">{group.city || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Postcode</label>
                <p className="text-base text-gray-900">{group.postcode || 'N/A'}</p>
              </div>

              <div className="col-span-1">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-base text-gray-900">{group.address || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Nurseries Count</label>
                <p className="text-base text-gray-900">{group.nurseriesCount || 0}</p>
              </div>

            
            </div>
          </div>

          {/* Owner Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-gray-900 border-b pb-2">
              Owner Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Owner Name</label>
                <p className="text-base text-gray-900">
                  {group.ownerFirstName && group.ownerLastName
                    ? `${group.ownerFirstName} ${group.ownerLastName}`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Owner Email</label>
                <p className="text-base text-gray-900">{group.ownerEmail || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Owner Phone</label>
                <p className="text-base text-gray-900">{group.ownerPhone || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Owner Status</label>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      group.ownerIsOnline
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {group.ownerIsOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(group.createdAt || group.updatedAt) && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Additional Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {group.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created At</label>
                    <p className="text-base text-gray-900">
                      {new Date(group.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {group.updatedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-base text-gray-900">
                      {new Date(group.updatedAt).toLocaleString()}
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
