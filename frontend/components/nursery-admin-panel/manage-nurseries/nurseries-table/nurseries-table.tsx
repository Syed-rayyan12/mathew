import React from "react";
import { Eye, Trash2, MoreVertical, CheckCircle, XCircle, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function NurseriesTable({ nurseries = [], onView, onEdit, onDelete, onToggleStatus }: any) {
    return (
        <div className="w-full mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
                <thead>
                    <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left" style={{ borderRadius: "4px 0px 0px 4px" }}>Name</th>
                        <th className="p-3 text-left">Group</th>
                        <th className="p-3 text-left">Town</th>
                        <th className="p-3 text-left">City</th>
                        <th className="p-3 text-left">Rating</th>
                        <th className="p-3 text-left">Reviews</th>
                        <th className="p-3 text-left">Owner Status</th>
                        <th className="p-3 text-left">Nursery Status</th>
                        <th className="p-3 text-left" style={{ borderRadius: "0px 4px 4px 0px" }}>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {nurseries.length === 0 ? (
                        <tr>
                            <td colSpan={10}>
                                <div className="flex justify-center w-full">
                                    <span className="block text-center py-10 text-gray-500">
                                        No Nurseries Found
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        nurseries.map((nursery: any) => (
                            <tr key={nursery.id} className="border-b hover:bg-gray-50">
                                <td className="py-6 px-3 font-bold">{nursery.id}</td>
                                <td className="py-6 px-3 font-bold">{nursery.name}</td>
                                <td className="py-6 px-3 text-gray-500">{nursery.groupName || 'N/A'}</td>
                                <td className="py-6 px-3 text-gray-500">{nursery.town || '-'}</td>
                                <td className="py-6 px-3 text-gray-500">{nursery.city}</td>
                                <td className="py-6 px-3">{nursery.averageRating?.toFixed(1) || '0.0'}</td>
                                <td className="py-6 px-3">{nursery.reviewsCount || 0}</td>
                                <td className="py-6 px-3">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm ${
                                            nursery.ownerIsOnline
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {nursery.ownerIsOnline ? "Online" : "Offline"}
                                    </span>
                                </td>
                                <td className="py-6 px-3">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            nursery.isApproved
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {nursery.isApproved ? "Active" : "Inactive"}
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
                                            <DropdownMenuItem onClick={() => onView?.(nursery)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit?.(nursery)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Nursery
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onToggleStatus?.(nursery)}>
                                                {nursery.isApproved ? (
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
                                                onClick={() => onDelete(nursery)}
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
