"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { AdminUser } from "@/lib/api/admin";

interface ApprovalViewModalProps {
  approval: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalViewModal({
  approval,
  open,
  onClose,
  onApprove,
  onReject,
}: ApprovalViewModalProps) {
  if (!approval) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            User Approval Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Name */}
          <div>
            <p className="font-medium text-sm text-gray-600">Name</p>
            <p className="text-lg font-semibold">{approval.firstName} {approval.lastName}</p>
          </div>

          {/* Email */}
          <div>
            <p className="font-medium text-sm text-gray-600">Email</p>
            <p className="text-lg">{approval.email}</p>
          </div>

          {/* Phone */}
          <div>
            <p className="font-medium text-sm text-gray-600">Phone</p>
            <p className="text-lg">{approval.phone || "N/A"}</p>
          </div>

          {/* Role */}
          <div>
            <p className="font-medium text-sm text-gray-600">Role</p>
            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">
              {approval.role.toLowerCase()}
            </span>
          </div>

          {/* Date Registered */}
          <div>
            <p className="font-medium text-sm text-gray-600">Registered</p>
            <p className="text-lg">{new Date(approval.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Buttons */}
        <DialogFooter className="mt-6 flex justify-end gap-3">

          {/* Close */}
          <Button
            variant="secondary"
            onClick={onClose}
            className="rounded-md"
          >
            Close
          </Button>

          {/* Approve */}
          <Button
            onClick={onApprove}
            className="bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>

          {/* Reject */}
          <Button
            onClick={onReject}
            className="bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
