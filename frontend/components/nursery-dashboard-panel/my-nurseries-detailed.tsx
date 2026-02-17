"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import NurseriesTable from "../nursery-admin-panel/manage-nurseries/nurseries-table/nurseries-table";
import ViewNurseriesModal from "../nursery-admin-panel/manage-nurseries/view-nurseries-modal/view-nurseries-modal";
import EditNurseryModal from "../nursery-admin-panel/manage-nurseries/edit-nurseries-modal/edit-nurseries-admin-modal";
import AddNurseryModal from "@/components/sharedComponents/add-nursery-modal";
import DeleteNurseriesModal from "../nursery-admin-panel/manage-nurseries/delete-nurseries-modal/delete-nurseries-modal";
import { nurseryDashboardService } from "@/lib/api/nursery";
import { toast } from "sonner";

export default function MyNurseriesDetailed() {
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
      const response = await nurseryDashboardService.getMyNursery();

      if (response.success && response.data) {
        let nurseriesData = Array.isArray(response.data) ? response.data : [];
        
        // Filter by search query
        if (debouncedSearch) {
          nurseriesData = nurseriesData.filter((nursery: any) =>
            nursery.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            nursery.city?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            nursery.postcode?.toLowerCase().includes(debouncedSearch.toLowerCase())
          );
        }

        // Filter by status
        if (statusFilter !== "all") {
          nurseriesData = nurseriesData.filter((nursery: any) => {
            if (statusFilter === "active") return nursery.isActive === true;
            if (statusFilter === "inactive") return nursery.isActive === false;
            return true;
          });
        }

        // Sort
        nurseriesData.sort((a: any, b: any) => {
          let aVal = a[sortBy];
          let bVal = b[sortBy];

          if (sortBy === "createdAt") {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
          }

          if (sortOrder === "asc") {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });

        setNurseries(nurseriesData);
      }
    } catch (error) {
      console.error('Failed to fetch nurseries:', error);
      toast.error('Failed to load nurseries');
    } finally {
      setLoading(false);
    }
  };

  // Add Nursery
  const handleAddNursery = () => {
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
      const response = await nurseryDashboardService.deleteNursery(selectedNursery.id);

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
      // Note: You may need to implement this API endpoint
      // For now, we'll just show a message
      toast.info('Status toggle feature coming soon');
      // Uncomment when backend endpoint is ready:
      // const response = await nurseryDashboardService.toggleNurseryStatus(nursery.id);
      // if (response.success) {
      //   toast.success(response.message);
      //   fetchNurseries();
      // }
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
          <p className="text-muted-foreground">Loading nurseries...</p>
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
            <span className="text-foreground">MY</span> Nurseries
          </h2>
          <p className="text-gray-600">View and manage all your nurseries in detail</p>
        </div>

        <Button variant="ghost" className="bg-secondary cursor-pointer w-full md:w-auto" onClick={() => setOpenAddModal(true)}>
          Add New Nursery
        </Button>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-lg mb-4 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nurseries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date Created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="city">City</SelectItem>
            <SelectItem value="averageRating">Rating</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest First</SelectItem>
            <SelectItem value="asc">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg">
        <NurseriesTable
          nurseries={nurseries}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      {/* MODALS */}
      <AddNurseryModal
        open={openAddModal}
        onOpenChange={setOpenAddModal}
        onSuccess={handleAddNursery}
      />

      <ViewNurseriesModal
        open={openViewModal}
        onOpenChange={setOpenViewModal}
        nursery={selectedNursery}
      />

      <EditNurseryModal
        open={openEditModal}
        onOpenChange={setOpenEditModal}
        nursery={selectedNursery}
        onSuccess={fetchNurseries}
      />

      <DeleteNurseriesModal
        open={openDeleteModal}
        onOpenChange={setOpenDeleteModal}
        onConfirm={handleDeleteNursery}
        nurseryName={selectedNursery?.name}
      />
    </div>
  );
}
