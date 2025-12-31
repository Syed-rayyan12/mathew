import React from "react";
import { Eye, Trash2 } from "lucide-react";

export default function UsersTable({ users = [], onView, onDelete }: any) {
    return (
        <div className="w-full mt-4 overflow-x-auto">

            <table className="w-full min-w-[800px]">
                <thead>
                    <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                          <th className="p-3 text-left">
                            ID
                        </th>
                        <th className="p-3 text-left" style={{ borderRadius: "4px 0px 0px 4px" }}>
                            Name
                        </th>
                        <th className="p-3 text-left">Role</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Joined</th>
                        <th className="p-3 text-left">Status</th>
                        <th
                            className="p-3 text-left"
                            style={{ borderRadius: "0px 4px 4px 0px" }}
                        >
                            Action
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {users.length === 0 ? (
                    <tr>
                        <td colSpan={7}>
                        <div className=" flex justify-center w-full">

                        <span className=" block  text-center py-10 text-gray-500 ">
                            No Users Found
                        </span>
                        </div>
                        </td>
                        </tr>
                    ) : (

                        users.map((user: any) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="py-6 px-3 font-bold">{user.id}</td>
                                <td className="py-6 px-3 font-bold">{user.firstName} {user.lastName}</td>
                                <td className="py-6 px-3 text-gray-500">{user.role}</td>
                                <td className="py-6 px-3 text-gray-500">{user.email}</td>
                                <td className="py-6 px-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="py-6 px-3">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${user.isOnline
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-700"
                                            }`}
                                    >
                                        {user.isOnline ? "Online" : "Inactive"}
                                    </span>
                                </td>
                            

                                <td className="py-6 px-3 flex items-center gap-3">
                                    <button onClick={() => onView?.(user)} title="View Details">
                                        <Eye className="w-4 h-4 text-foreground" />
                                    </button>

                                    <button onClick={() => onDelete(user)} title="Delete User">
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
