"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import AddUserModal from "./add-user-modal/add-user-modal";
import ViewUserModal from "./view-user-modal/view-user-modal";
import DeleteUserModal from "./delete-user-modal/delete-user-modal";
import UsersTable from "./user-table/user-table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { adminService } from "@/lib/api/admin";
import { toast } from "sonner";

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users with token:', localStorage.getItem('accessToken')?.substring(0, 20) + '...')
      const response = await adminService.getAllUsers({
        searchQuery: debouncedSearch,
        sortBy,
        sortOrder,
        status: statusFilter,
        role: roleFilter,
      });
      console.log('Users response:', response)
      if (response.success && response.data) {
        setUsers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      const errorMessage = error?.message || 'Failed to load users';
      toast.error(errorMessage);
      
      // If unauthorized, redirect to login
      if (error?.statusCode === 401 || error?.message?.includes('Admin access required')) {
        toast.error('Please login as admin');
        setTimeout(() => {
          window.location.href = '/admin-login';
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, statusFilter, roleFilter, sortBy, sortOrder]);

  // Add User
  const handleAddUser = (newUser: any) => {
    setUsers((prev) => [...prev, newUser]);
    fetchUsers(); // Refresh the list
  };

  // View User
  const handleView = (user: any) => {
    setSelectedUser(user);
    setOpenViewModal(true);
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await adminService.deleteUser(selectedUser.id);
      if (response.success) {
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
        toast.success('User deleted successfully');
      }
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setOpenDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setOpenDeleteModal(true);
  };

  return (
    <div className="w-full">

      {/* HEADER */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
              <span className="text-foreground">MANAGE</span> Users
            </h2>
            <p className="text-gray-600">View, edit, and manage all platform Users</p>
          </div>

          {/* <Button variant="ghost" className="bg-secondary cursor-pointer w-full md:w-auto" onClick={() => setOpenAddModal(true)}>
            Add Users
          </Button> */}
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="w-full bg-white p-4 rounded-lg flex items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10 rounded-sm"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] flex items-center gap-2 rounded-sm border border-secondary bg-white px-3 py-2 text-sm">
            <Filter className="h-4 w-4 pointer-events-none text-secondary" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>

        {/* <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px] rounded-sm">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="PARENT">Parent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] rounded-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date</SelectItem>
            <SelectItem value="firstName">Name</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select> */}
      </div>

      {/* TABLE */}
      <div className="shadow-md p-4 bg-white rounded-lg">
        <h2 className="font-sans font-bold text-xl">All Users</h2>
        <p className="text-gray-500">Manage and monitor your workspace groups effortlessly.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <UsersTable users={users} onView={handleView} onDelete={handleDelete} />
        )}
      </div>

      {/* MODALS */}
      <AddUserModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onAdd={handleAddUser}
      />

      <ViewUserModal
        open={openViewModal}
        user={selectedUser}
        onClose={() => {
          setOpenViewModal(false);
          setSelectedUser(null);
        }}
      />

      <DeleteUserModal
        open={openDeleteModal}
        user={selectedUser}
        onClose={() => setOpenDeleteModal(false)}
        onConfirmDelete={handleDeleteUser}
      />
    </div>
  );
}
