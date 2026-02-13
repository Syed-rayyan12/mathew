"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import NurseriesTable from "./nurseries-table/nurseries-table";
import ViewNurseriesModal from "./view-nurseries-modal/view-nurseries-modal";
import EditNurseryModal from "./edit-nurseries-modal/edit-nurseries-admin-modal";
import AddNurseriesModal from "./add-nurseries-modal/add-nurseries-modal";
import DeleteNurseriesModal from "./delete-nurseries-modal/delete-nurseries-modal";
import { adminService } from "@/lib/api/admin";
import { toast } from "sonner";

export default function ManageNurseries() {
  const [nurseries, setNurseries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedNursery, setSelectedNursery] = useState<any>(null);

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchNurseries();
  }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

  const fetchNurseries = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllNurseries({
        searchQuery: debouncedSearch ,
        sortBy,
        sortOrder,
        status: statusFilter,
      });

      if (response.success && response.data) {
        setNurseries(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch nurseries:', error);
      toast.error('Failed to load nurseries');
    } finally {
      setLoading(false);
    }
  };


  // Add Nursery
  const handleAddNursery = (newNursery: any) => {
    setNurseries((prev) => [...prev, newNursery]);
    fetchNurseries(); // Refresh the list
  };

  // View Nursery
  const handleView = (nursery: any) => {
    setSelectedNursery(nursery);
    setOpenViewModal(true);
  };

  // Edit Nursery
  const handleEdit = (nursery: any) => {
    setSelectedNursery(nursery);
    setOpenEditModal(true);
  };

  // Delete Nursery
  const handleDeleteNursery = async () => {
    if (!selectedNursery) return;

    try {
      const response = await adminService.deleteNursery(selectedNursery.id);

      if (response.success) {
        toast.success('Nursery deleted successfully');
        setNurseries((prev) => prev.filter((n) => n.id !== selectedNursery.id));
      } else {
        toast.error(response.message || 'Failed to delete nursery');
      }
    } catch (error) {
      console.error('Delete nursery error:', error);
      toast.error('An error occurred while deleting the nursery');
    } finally {
      setOpenDeleteModal(false);
      setSelectedNursery(null);
    }
  };

  const handleDelete = (nursery: any) => {
    setSelectedNursery(nursery);
    setOpenDeleteModal(true);
  };

  // Toggle nursery active status
  const handleToggleStatus = async (nursery: any) => {
    try {
      const response = await adminService.toggleNurseryStatus(nursery.id);
      if (response.success) {
        toast.success(response.message);
        fetchNurseries(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Failed to toggle nursery status:', error);
      toast.error(error?.message || 'Failed to update nursery status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading nursery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* HEADER */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
            <span className="text-foreground">MANAGE</span> Nurseries
          </h2>
          <p className="text-gray-600">View, edit, and manage all platform nurseries</p>
        </div>

        <Button variant="ghost" className="bg-secondary cursor-pointer w-full md:w-auto" onClick={() => setOpenAddModal(true)}>
          Add Nursery
        </Button>
      </div>

      {/* SEARCH + FILTER */}
      <div className="w-full bg-white p-4 rounded-lg flex items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10 rounded-sm"
            placeholder="Search by nursery name or group..."
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

        {/* <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] rounded-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="city">City</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select> */}
      </div>

      {/* TABLE */}
      <div className="shadow-md p-4 bg-white rounded-lg">
        <h2 className="font-sans font-bold text-xl">All Nurseries</h2>
        <p className="text-gray-500">Manage and monitor your nurseries effortlessly.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <NurseriesTable nurseries={nurseries} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />
        )}
      </div>

      {/* MODALS */}
      <AddNurseriesModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onAdd={handleAddNursery}
      />

      <ViewNurseriesModal
        open={openViewModal}
        nursery={selectedNursery}
        onClose={() => {
          setOpenViewModal(false);
          setSelectedNursery(null);
        }}
      />

      <EditNurseryModal
        open={openEditModal}
        nursery={selectedNursery}
        onClose={() => {
          setOpenEditModal(false);
          setSelectedNursery(null);
        }}
        onSuccess={fetchNurseries}
      />

      <DeleteNurseriesModal
        open={openDeleteModal}
        nursery={selectedNursery}
        onClose={() => setOpenDeleteModal(false)}
        onConfirmDelete={handleDeleteNursery}
      />
    </div>
  );
}
