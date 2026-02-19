"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface DayTiming {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface WeeklyTimingsProps {
  timings: DayTiming[];
  onChange: (timings: DayTiming[]) => void;
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export default function WeeklyTimings({ timings, onChange }: WeeklyTimingsProps) {
  const handleDayToggle = (index: number, isOpen: boolean) => {
    const newTimings = [...timings];
    newTimings[index] = { ...newTimings[index], isOpen };
    onChange(newTimings);
  };

  const handleTimeChange = (index: number, field: "openTime" | "closeTime", value: string) => {
    const newTimings = [...timings];
    newTimings[index] = { ...newTimings[index], [field]: value };
    onChange(newTimings);
  };

  return (
    <div>
      <h3 className="font-medium text-lg mb-4">Weekly Opening Hours</h3>
      <div className="space-y-3">
        {timings.map((timing, index) => (
          <div key={timing.day} className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="flex items-center space-x-2 w-32">
              <Checkbox
                id={`day-${index}`}
                checked={timing.isOpen}
                onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
              />
              <Label
                htmlFor={`day-${index}`}
                className="text-sm font-medium cursor-pointer"
              >
                {timing.day}
              </Label>
            </div>

            {timing.isOpen ? (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <Input
                    type="time"
                    value={timing.openTime}
                    onChange={(e) => handleTimeChange(index, "openTime", e.target.value)}
                    className="w-full"
                    placeholder="Opening time"
                  />
                </div>
                <span className="text-muted-foreground">to</span>
                <div className="flex-1">
                  <Input
                    type="time"
                    value={timing.closeTime}
                    onChange={(e) => handleTimeChange(index, "closeTime", e.target.value)}
                    className="w-full"
                    placeholder="Closing time"
                  />
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm flex-1">Closed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const getDefaultTimings = (): DayTiming[] => {
  return WEEKDAYS.map((day) => ({
    day,
    isOpen: true, // Default: All weekdays open
    openTime: "08:00",
    closeTime: "18:00",
  }));
};

export const parseTimingsFromOpeningHours = (openingHours: any): DayTiming[] => {
  // If openingHours has weekly schedule
  if (openingHours?.schedule && Array.isArray(openingHours.schedule)) {
    return openingHours.schedule;
  }
  
  // If old format with just openingTime and closingTime, create default schedule
  if (openingHours?.openingTime || openingHours?.closingTime) {
    const openTime = openingHours.openingTime || "08:00";
    const closeTime = openingHours.closingTime || "18:00";
    
    return WEEKDAYS.map((day) => ({
      day,
      isOpen: true,
      openTime,
      closeTime,
    }));
  }
  
  // Default timings
  return getDefaultTimings();
};

export const formatTimingsForAPI = (timings: DayTiming[]) => {
  return {
    schedule: timings,
  };
};
