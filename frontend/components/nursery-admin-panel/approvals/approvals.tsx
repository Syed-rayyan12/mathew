"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import ApprovalTable from "./approval-table.tsx/approval-table";
import ApprovalViewModal from "./approval-view-modal/approval-view-modal";
import { adminService, AdminUser } from "@/lib/api/admin";
import { toast } from "sonner";


export default function ManageApprovals() {
    const [approvals, setApprovals] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [openViewModal, setOpenViewModal] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState<AdminUser | null>(null);

    useEffect(() => {
        fetchPendingApprovals();
    }, [searchQuery]);

    const fetchPendingApprovals = async () => {
        try {
            setLoading(true);
            const response = await adminService.getPendingApprovals({
                searchQuery,
            });

            if (response.success && Array.isArray(response.data)) {
                setApprovals(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch pending approvals:", error);
            toast.error("Failed to load pending approvals");
        } finally {
            setLoading(false);
        }
    };

    // ✅ VIEW handler
    const handleView = (approval: AdminUser) => {
        setSelectedApproval(approval);
        setOpenViewModal(true);
    };

    // ✅ Approve user
    const handleApprove = async () => {
        if (!selectedApproval) return;

        try {
            const response = await adminService.approveUser(selectedApproval.id);
            
            if (response.success) {
                toast.success("User approved successfully!");
                setApprovals(prev => prev.filter(u => u.id !== selectedApproval.id));
                setOpenViewModal(false);
                setSelectedApproval(null);
            }
        } catch (error) {
            console.error("Failed to approve user:", error);
            toast.error("Failed to approve user");
        }
    };

    // ✅ Reject user
    const handleReject = async () => {
        if (!selectedApproval) return;

        try {
            const response = await adminService.rejectUser(selectedApproval.id);
            
            if (response.success) {
                toast.success("User rejected successfully!");
                setApprovals(prev => prev.filter(u => u.id !== selectedApproval.id));
                setOpenViewModal(false);
                setSelectedApproval(null);
            }
        } catch (error) {
            console.error("Failed to reject user:", error);
            toast.error("Failed to reject user");
        }
    };

    return (
        <div className="w-full">
            {/* HEADER */}
            <div className="bg-white p-4 shadow-md rounded-lg mb-4">
                <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
                    <span className="text-foreground">MANAGE</span> Approvals
                </h2>
                <p className="text-gray-600">Approve or reject user registrations</p>
            </div>

            {/* SEARCH + FILTER */}
            <div className="w-full bg-white p-4 rounded-lg flex items-center gap-4 mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-sm"
                        placeholder="Search by name or email..."
                    />
                </div>
            </div>

            {/* TABLE */}
            <div className="shadow-md p-4 bg-white rounded-lg">
                <h2 className="font-sans font-bold text-xl">Pending Approvals</h2>
                <p className="text-gray-500">Review and approve user registrations.</p>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <ApprovalTable
                        approvals={approvals}
                        onView={handleView}
                    />
                )}
            </div>

            {/* ✅ APPROVAL VIEW MODAL */}
            <ApprovalViewModal
                open={openViewModal}
                approval={selectedApproval}
                onClose={() => {
                    setOpenViewModal(false);
                    setSelectedApproval(null);
                }}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
}
