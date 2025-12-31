"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteReviewsModal({onConfirmDelete, open, onClose, user }: any) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-4">
        <DialogHeader>  
          <DialogTitle className="font-sans">Delete User</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete <b>{user.name}</b>?</p>

        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirmDelete} className="bg-red-600 cursor-pointer text-white hover:bg-red-700">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 

