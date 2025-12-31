"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ViewReviewModal({
  open,
  review,
  onClose,
  onStatusChange,
}: {
  open: boolean;
  review: any;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [localStatus, setLocalStatus] = useState("");

  // ✅ Update localStatus whenever a new review is selected
  useEffect(() => {
    if (review) {
      setLocalStatus(review.status || "pending");
    }
  }, [review]);

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Review Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Reviewer */}
          <div>
            <p className="text-sm font-medium text-gray-600">Reviewer</p>
            <p className="text-md font-semibold">{review.firstName} {review.lastName}</p>
          </div>

          {/* Email */}
          <div>
            <p className="text-sm font-medium text-gray-600">Email</p>
            <p className="text-md">{review.email}</p>
          </div>

          {/* Nursery */}
          <div>
            <p className="text-sm font-medium text-gray-600">Nursery</p>
            <p className="text-md font-semibold">{review.nursery.name}</p>
          </div>

          {/* Rating */}
          <div>
            <p className="text-sm font-medium text-gray-600">Rating</p>
            <p className="text-md font-semibold">{review.overallRating.toFixed(1)} / 5.0</p>
          </div>

          {/* Message */}
          <div>
            <p className="text-sm font-medium text-gray-600">Review Content</p>
            <p className="text-md">{review.content}</p>
          </div>

          {/* Visit Date */}
          {review.visitDate && (
            <div>
              <p className="text-sm font-medium text-gray-600">Visit Date</p>
              <p className="text-md">{new Date(review.visitDate).toLocaleDateString()}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Status</p>

            <Select
              value={localStatus}
              onValueChange={(val) => setLocalStatus(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-5 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-md"
          >
            Close
          </Button>

          <Button
            onClick={() => {
              onStatusChange(localStatus);
              onClose();
            }}
            className="bg-primary text-white rounded-md"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
