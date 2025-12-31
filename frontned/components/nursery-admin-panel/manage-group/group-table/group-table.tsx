"use client";

import React from "react";
import { Eye, Trash2 } from "lucide-react";

export default function GroupsTable({ groups = [], onView, onDelete }: any) {
  return (
    <div className="w-full mt-4 overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
            <th className="p-3 text-left">Group Name</th>
            <th className="p-3 text-left">Owner</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">City</th>
            <th className="p-3 text-left">Nurseries</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <div className="flex justify-center py-10 text-gray-500">
                  No Groups Found
                </div>
              </td>
            </tr>
          ) : (
            groups.map((group: any) => (
              <tr key={group.id} className="border-b hover:bg-gray-50">
                <td className="py-6 px-3 font-bold">{group.name}</td>
                <td className="py-6 px-3 text-gray-500">
                  {group.ownerFirstName} {group.ownerLastName}
                </td>
                <td className="py-6 px-3 text-gray-500">{group.ownerEmail}</td>
                <td className="py-6 px-3 text-gray-500">{group.city || 'N/A'}</td>
                <td className="py-6 px-3">{group.nurseriesCount || 0}</td>
                <td className="py-6 px-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      group.ownerIsOnline
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {group.ownerIsOnline ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="py-6 px-3 flex items-center gap-3">
                  <button onClick={() => onView?.(group)} title="View Details">
                    <Eye className="w-4 h-4 text-foreground" />
                  </button>

                  <button onClick={() => onDelete(group)} title="Delete Group">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
