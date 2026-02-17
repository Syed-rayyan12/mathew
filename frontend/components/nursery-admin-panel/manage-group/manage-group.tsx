"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import UsersTable from "./group-table/group-table"; // Your table component

import ViewGroupModal from "./view-group-modal/view-group-modal";
import EditGroupModal from "./edit-group-modal/edit-group-admin-modal";
import { DeleteGroupModal } from "./delete-group-modal/delete-group-modal";
import { AddGroupModal } from "./add-group-modal/add-group-modal";
import { adminService } from "@/lib/api/admin";
import { toast } from "sonner";

export default function ManageGroups() {
  const [groups, setGroups] = useState<any[]>([]); // Start with empty array
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    fetchGroups();
  }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllGroups({
        searchQuery : debouncedSearch ,
        sortBy,
        sortOrder,
        status: statusFilter,
      });
      if (response.success && response.data) {
        setGroups(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Add new group
  const handleAddGroup = (newGroup: any) => {
    setGroups((prev) => [...prev, newGroup]);
    fetchGroups(); // Refresh the list
  };

  // View group
  const handleView = (group: any) => {
    setSelectedGroup(group);
    setOpenViewModal(true);
  };

  // Edit group
  const handleEdit = (group: any) => {
    setSelectedGroup(group);
    setOpenEditModal(true);
  };

  // Delete group
  const handleDeleteGroupConfirm = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await adminService.deleteGroup(selectedGroup.id);
      if (response.success) {
        setGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
        toast.success('Group deleted successfully');
      }
    } catch (error: any) {
      console.error('Failed to delete group:', error);
      toast.error(error?.message || 'Failed to delete group');
    } finally {
      setOpenDeleteModal(false);
      setSelectedGroup(null);
    }
  };

  // Open delete modal
  const handleDelete = (group: any) => {
    setSelectedGroup(group);
    setOpenDeleteModal(true);
  };

  // Toggle group active status
  const handleToggleStatus = async (group: any) => {
    try {
      const response = await adminService.toggleGroupStatus(group.id);
      if (response.success) {
        toast.success(response.message);
        fetchGroups(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Failed to toggle group status:', error);
      toast.error(error?.message || 'Failed to update group status');
    }
  };

  return (
    <div className="w-full">

      {/* Top Header */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
              <span className="text-foreground">MANAGE</span> Groups
            </h2>
            <p className="text-gray-600">
              View, edit, and manage all platform groups
            </p>
          </div>

          {/* <Button className="bg-secondary cursor-pointer w-full md:w-auto" variant="ghost" onClick={() => setOpenAddModal(true)}>
            Add New Group
          </Button> */}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="w-full bg-white p-4 rounded-lg flex items-center gap-4 mb-4">

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10 rounded-sm"
            placeholder="Search by group name, owner or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
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

        {/* Sort By */}
        {/* <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] rounded-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="city">City</SelectItem>
          </SelectContent>
        </Select> */}

      </div>

      {/* Table */}
      <div className="shadow-md p-4 bg-white rounded-lg">
        <h2 className="font-sans font-bold text-xl">All Groups</h2>
        <p className="text-gray-500">Manage and monitor your workspace groups effortlessly.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <UsersTable
            groups={groups}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      {/* Modals */}
      <AddGroupModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onAdd={handleAddGroup}
      />

      <ViewGroupModal
        open={openViewModal}
        group={selectedGroup}
        onClose={() => {
          setOpenViewModal(false);
          setSelectedGroup(null);
        }}
      />

      <EditGroupModal
        open={openEditModal}
        group={selectedGroup}
        onClose={() => {
          setOpenEditModal(false);
          setSelectedGroup(null);
        }}
        onSuccess={fetchGroups}
      />

      <DeleteGroupModal
        open={openDeleteModal}
        group={selectedGroup}
        onClose={() => setOpenDeleteModal(false)}
        onConfirmDelete={handleDeleteGroupConfirm}
      />

    </div>
  );
}
