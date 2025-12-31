"use client";
import React from "react";
import { Input } from "../ui/input";
import { MapPin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

const nurseries = [
  {
    id: 1,
    name: "Sunshine Nursery",
    location: "London, UK",
    image: "/images/list 1.png",
  },
  {
    id: 2,
    name: "LITTLE STARS ACADEMY",
    location: "London, UK",
    image: "/images/list 2.png",
  },
  {
    id: 3,
    name: "RAINBOW KIDS CENTER",
    location: "London, UK",
    image: "/images/list 3.png",
  },
  {
    id: 4,
    name: "RAINBOW KIDS CENTER",
    location: "London, UK",
    image: "/images/list 4.png",
  },
];

function PhotosGallery() {
  const router = useRouter();

  return (
    <div>
      <h2 className="text-secondary font-medium text-[48px] font-heading">
        <span className="text-foreground">PHOTOS </span>& MEDIA GALLERY
      </h2>
      <p>Manage your saved nurseries and compare options</p>

      <div className="pt-4">
        <Input
          placeholder="Search your shortlisted nurseries..."
          className="w-[50%] rounded-md h-9 bg-white"
        />
      </div>

      <div className="flex gap-4  mt-6">
        {nurseries.map((nursery) => (
          <div key={nursery.id} className="bg-white rounded-md p-3 flex flex-col gap-4 w-[300px]">
            <img src={nursery.image} alt={nursery.name} className="rounded-md" />
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-medium font-heading">{nursery.name}</h3>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{nursery.location}</span>
              </div>
              <div className="flex gap-3 mt-3 justify-between items-center">
                <Button
                variant="Link"
                  onClick={() =>
                    router.push("/nursery-dashboard/photos-media-gallery/edit-image")
                  }
                  className="bg-secondary text-primary-foreground hover:bg-none cursor-pointer rounded-md px-6 py-2"
                >
                  Edit Image
                </Button>
                <button className="border border-gray-400 text-foreground rounded-md px-2 py-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PhotosGallery;
