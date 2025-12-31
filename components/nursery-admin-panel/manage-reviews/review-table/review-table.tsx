import React from "react";
import { Eye, Trash2 } from "lucide-react";
import { AdminReview } from "@/lib/api/admin";

interface ReviewTableProps {
  reviews: AdminReview[];
  onView: (review: AdminReview) => void;
  onDelete: (review: AdminReview) => void;
}

export default function ReviewTable({ reviews = [], onView, onDelete }: ReviewTableProps) {
  return (
    <div className="w-full mt-4 overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
            <th className="p-3 text-left" style={{ borderRadius: "4px 0px 0px 4px" }}>
              Reviewer
            </th>
            <th className="p-3 text-left">Nursery</th>
            <th className="p-3 text-left">Rating</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left" style={{ borderRadius: "0px 4px 4px 0px" }}>
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="flex justify-center w-full">
                  <span className="block text-center py-10 text-gray-500">
                    No Reviews Found
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            reviews.map((review) => (
              <tr key={review.id} className="border-b hover:bg-gray-50">
                {/* Reviewer */}
                <td className="py-6 px-3 font-bold">
                  {review.firstName} {review.lastName}
                </td>

                {/* Nursery */}
                <td className="py-6 px-3 font-bold">
                  {review.nursery.name}
                </td>

                {/* Rating */}
                <td className="py-6 px-3 text-gray-500">
                  {review.overallRating.toFixed(1)}
                </td>

                {/* Date */}
                <td className="py-6 px-3 text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </td>

                {/* Status */}
                <td className="py-6 px-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm capitalize ${
                      review.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : review.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {review.status}
                  </span>
                </td>

                {/* Action */}
                <td className="py-6 px-3 flex items-center gap-3">
                  <button onClick={() => onView(review)}>
                    <Eye className="w-4 h-4 text-foreground" />
                  </button>

                  <button onClick={() => onDelete(review)}>
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
