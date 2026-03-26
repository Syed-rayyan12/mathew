"use client";

import React, { useState, useRef } from "react";
import { Input } from "../ui/input";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadService } from "@/lib/api/upload";

export default function UploadGallery() {
  const [galleryImages, setGalleryImages] = useState<string[]>([
    "/images/list 1.png",
    "/images/list 2.png",
    "/images/list 3.png",
    "/images/list 4.png",
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      toast.error("Only image files are allowed.");
      return;
    }

    setUploading(true);
    try {
      const urls = await uploadService.uploadImages(imageFiles);
      setGalleryImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleRemoveImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClickUpload = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-secondary font-medium text-[48px] font-heading">
        <span className="text-foreground">PHOTOS </span>& MEDIA GALLERY
      </h2>
      <p>Manage your saved nurseries and compare options</p>

      {/* File Upload Card */}
      <div className="bg-white mt-6 rounded-md p-6 border border-gray-300 flex flex-col items-center gap-4">
        <div
          className={`border-2 border-dashed rounded-md p-12 flex flex-col items-center justify-center gap-4 w-full cursor-pointer
            ${isDragging ? "border-green-400 bg-gray-100" : "border-gray-400 bg-white"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onClick={handleClickUpload}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploading ? (
            <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-gray-500" />
          )}
          <h3 className="text-lg font-sans font-semibold">
            {uploading
              ? "Uploading..."
              : "Drop images here or click to browse"}
          </h3>
          <p className="text-sm text-gray-500">
            Supported formats: JPG, PNG, GIF, WebP — max 10 MB each
          </p>
          <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            disabled={uploading}
          />
        </div>
      </div>

      {/* Gallery Card */}
      <div className="bg-white rounded-md mt-6 p-6 border border-gray-300 flex flex-col gap-4">
        <h3 className="text-lg font-sans font-semibold">Gallery</h3>
        {galleryImages.length === 0 ? (
          <p className="text-gray-500">No images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((img, index) => (
              <div
                key={index}
                className="relative w-full h-40 border rounded-md overflow-hidden"
              >
                <img
                  src={img}
                  alt={`gallery-${index}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-white rounded-full p-1"
                  onClick={() => handleRemoveImage(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
