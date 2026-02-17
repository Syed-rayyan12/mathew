"use client";

import React from "react";
import { Eye, Trash2, MoreVertical, CheckCircle, XCircle, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function GroupsTable({ groups = [], onView, onEdit, onDelete, onToggleStatus }: any) {
  return (
    <div className="w-full mt-4 overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
            <th className="p-3 text-left">Group Name</th>
            <th className="p-3 text-left">Owner</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Town</th>
            <th className="p-3 text-left">City</th>
            <th className="p-3 text-left">Nurseries</th>
            <th className="p-3 text-left">Owner Status</th>
            <th className="p-3 text-left">Group Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={9}>
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
                <td className="py-6 px-3 text-gray-500">{group.town || '-'}</td>
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
                <td className="py-6 px-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      group.isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {group.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-6 px-3 flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(group)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(group)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Group
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus?.(group)}>
                        {group.isActive ? (
                          <>
                            <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            <span>Activate</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(group)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
