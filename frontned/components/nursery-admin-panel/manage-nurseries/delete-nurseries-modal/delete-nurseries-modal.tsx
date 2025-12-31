"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteNurseryModal({ onConfirmDelete, open, onClose, nursery }: any) {
  if (!nursery) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-4">
        <DialogHeader>  
          <DialogTitle className="font-sans">Delete Nursery</DialogTitle>
        </DialogHeader>

        <p>
          Are you sure you want to delete <b>{nursery.name}</b>?
        </p>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmDelete}
            className="bg-red-600 cursor-pointer text-white hover:bg-red-700"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
