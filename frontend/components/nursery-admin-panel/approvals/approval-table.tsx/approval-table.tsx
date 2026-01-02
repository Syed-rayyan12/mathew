import React from "react";
import { Eye } from "lucide-react";
import { AdminUser } from "@/lib/api/admin";

interface ApprovalTableProps {
  approvals: AdminUser[];
  onView: (user: AdminUser) => void;
}

export default function ApprovalTable({ approvals = [], onView }: ApprovalTableProps) {
  return (
    <div className="w-full mt-4 overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
            <th className="p-3 text-left" style={{ borderRadius: "4px 0px 0px 4px" }}>
              Name
            </th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Phone</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Registered</th>
            <th className="p-3 text-left" style={{ borderRadius: "0px 4px 4px 0px" }}>
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {approvals.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="flex justify-center w-full">
                  <span className="block text-center py-10 text-gray-500">
                    No Pending Approvals
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            approvals.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                {/* Name */}
                <td className="py-6 px-3 font-semibold">
                  {user.firstName} {user.lastName}
                </td>

                {/* Email */}
                <td className="py-6 px-3">
                  {user.email}
                </td>

                {/* Phone */}
                <td className="py-6 px-3 text-gray-500">
                  {user.phone || "N/A"}
                </td>

                {/* Role */}
                <td className="py-6 px-3">
                  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">
                    {user.role.toLowerCase()}
                  </span>
                </td>

                {/* Date */}
                <td className="py-6 px-3 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                {/* Action */}
                <td className="py-6 px-3">
                  <button onClick={() => onView(user)}>
                    <Eye className="w-4 h-4 text-foreground" />
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
