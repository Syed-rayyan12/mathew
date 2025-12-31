import React from "react";
import { Eye, Trash2 } from "lucide-react";

export default function NurseriesTable({ nurseries = [], onView, onDelete }: any) {
    return (
        <div className="w-full mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
                <thead>
                    <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left" style={{ borderRadius: "4px 0px 0px 4px" }}>Name</th>
                        <th className="p-3 text-left">Group</th>
                        <th className="p-3 text-left">City</th>
                        <th className="p-3 text-left">Rating</th>
                        <th className="p-3 text-left">Reviews</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left" style={{ borderRadius: "0px 4px 4px 0px" }}>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {nurseries.length === 0 ? (
                        <tr>
                            <td colSpan={8}>
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
                                <td className="py-6 px-3 flex items-center gap-3">
                                    <button onClick={() => onView?.(nursery)} title="View Details">
                                        <Eye className="w-4 h-4 text-foreground" />
                                    </button>

                                    <button onClick={() => onDelete(nursery)} title="Delete Nursery">
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
