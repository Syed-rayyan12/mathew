"use client";
import { QUALIFICATION_GROUPS } from "@/lib/data/qualifications";

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function QualificationCheckboxes({ selected, onChange }: Props) {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((q) => q !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="max-h-64 overflow-y-auto space-y-4 border rounded-lg p-3 bg-white">
      {QUALIFICATION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <label key={item} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(item)}
                  onChange={() => toggle(item)}
                  className="w-4 h-4 accent-[#044A55]"
                />
                <span className="text-sm">{item}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
