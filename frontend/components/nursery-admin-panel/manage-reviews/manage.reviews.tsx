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
import ReviewTable from "./review-table/review-table";
import DeleteReviewsModal from "./delete-review-modal/delete-review-modal";
import ViewReviewModal from "./view-reviews-modal/view-reviews-modal";
import { adminService, AdminReview } from "@/lib/api/admin";
import { toast } from "sonner";

export default function ManageReviews() {
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [openViewModal, setOpenViewModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);

    // Debounce search input for better performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchReviews();
    }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

    // Debug: Log reviews when they change
    useEffect(() => {
        console.log('📊 Reviews updated:', reviews.length, 'reviews');
        if (reviews.length > 0) {
            const ids = reviews.map(r => r.id);
            const uniqueIds = new Set(ids);
            if (ids.length !== uniqueIds.size) {
                console.warn('⚠️ DUPLICATE REVIEW IDs DETECTED!');
                console.log('All IDs:', ids);
            }
        }
    }, [reviews]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAllReviews({
                searchQuery: debouncedSearch,
                status: statusFilter,
                sortBy,
                sortOrder,
            });

            if (response.success && Array.isArray(response.data)) {
                // Deduplicate reviews by ID
                const uniqueReviews = Array.from(
                    new Map(response.data.map((review: AdminReview) => [review.id, review])).values()
                ) as AdminReview[];
                
                if (uniqueReviews.length !== response.data.length) {
                    console.warn('⚠️ Duplicates removed:', response.data.length - uniqueReviews.length);
                }
                
                setReviews(uniqueReviews);
            } else {
                setReviews([]);
            }
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
            toast.error("Failed to load reviews");
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    // ✅ VIEW handler
    const handleView = (review: AdminReview) => {
        setSelectedReview(review);
        setOpenViewModal(true);
    };
    
    // ✅ DELETE handler
    const handleDelete = (review: AdminReview) => {
        setSelectedReview(review);
        setOpenDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedReview) return;
        
        try {
            const response = await adminService.deleteReview(selectedReview.id);
            
            if (response.success) {
                setReviews((prev) => prev.filter((r) => r.id !== selectedReview.id));
                setSelectedReview(null);
                setOpenDeleteModal(false);
                toast.success("Review deleted successfully");
            } else {
                throw new Error("Failed to delete review");
            }
        } catch (error) {
            console.error("Failed to delete review:", error);
            toast.error("Failed to delete review");
        }
    };

    const handleReviewStatusChange = (reviewId: string, newStatus: string) => {
        // Refresh reviews after status change
        fetchReviews();
    };

    return (
        <div className="w-full">
            {/* HEADER */}
            <div className="bg-white p-4 shadow-md rounded-lg mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
                            <span className="text-foreground">MANAGE</span> Reviews
                        </h2>
                        <p className="text-gray-600">View and manage platform reviews</p>
                    </div>
                </div>
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
                        placeholder="Search by reviewer, nursery or email..."
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] flex items-center gap-2 rounded-sm border border-secondary bg-white px-3 py-2 text-sm">
                        <Filter className="h-4 w-4 pointer-events-none text-secondary" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* TABLE */}
            <div className="shadow-md p-4 bg-white rounded-lg">
                <h2 className="font-sans font-bold text-xl">All Reviews</h2>
                <p className="text-gray-500">Manage and monitor nursery reviews.</p>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <ReviewTable
                        reviews={reviews}
                        onView={handleView}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* DELETE MODAL */}
            <DeleteReviewsModal
                open={openDeleteModal}
                user={selectedReview}
                onClose={() => setOpenDeleteModal(false)}
                onConfirmDelete={handleConfirmDelete}
            />
            <ViewReviewModal
                open={openViewModal}
                review={selectedReview}
                onClose={() => {
                    setOpenViewModal(false);
                    setSelectedReview(null);
                }}
                onStatusChange={(newStatus: string) => {
                    if (!selectedReview) return;
                    handleReviewStatusChange(selectedReview.id, newStatus);
                }}
            />
        </div>
    );
}
