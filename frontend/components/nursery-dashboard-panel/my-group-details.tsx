"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nurseryDashboardService } from "@/lib/api/nursery";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Mail, Calendar, Users, CheckCircle2, XCircle } from "lucide-react";
import ViewGroupModal from "../nursery-admin-panel/manage-group/view-group-modal/view-group-modal";
import EditGroupModal from "../nursery-admin-panel/manage-group/edit-group-modal/edit-group-admin-modal";

export default function MyGroupDetails() {
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);

  useEffect(() => {
    fetchGroup();
  }, []);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const response = await nurseryDashboardService.getMyGroup();

      if (response.success && response.data) {
        setGroup(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch group:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    setOpenViewModal(true);
  };

  const handleEdit = () => {
    setOpenEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="w-full">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Group Found</h3>
          <p className="text-muted-foreground">You don't have a group associated with your account yet.</p>
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
            <span className="text-foreground">MY</span> Group
          </h2>
          <p className="text-gray-600">View and manage your nursery group details</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleViewDetails}>
            View Full Details
          </Button>
          <Button className="bg-secondary cursor-pointer" onClick={handleEdit}>
            Edit Group
          </Button>
        </div>
      </div>

      {/* GROUP OVERVIEW CARD */}
      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Building2 className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{group.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Group ID: {group.shortId || group.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {group.isActive ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                
                {group.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{group.email}</p>
                    </div>
                  </div>
                )}

                {group.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{group.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Location</h3>
                
                {group.city && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{group.city}</p>
                    </div>
                  </div>
                )}

                {group.town && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Town</p>
                      <p className="font-medium">{group.town}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Statistics</h3>
                
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Nurseries</p>
                    <p className="font-medium">{group._count?.nurseries || 0}</p>
                  </div>
                </div>
              </div>

              {/* Other Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Other Details</h3>
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created On</p>
                    <p className="font-medium">
                      {new Date(group.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {group.updatedAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {new Date(group.updatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group Image */}
        {group.cardImage && (
          <Card>
            <CardHeader>
              <CardTitle>Group Image</CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src={group.cardImage} 
                alt={group.name}
                className="w-full max-w-md rounded-lg shadow-md"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODALS */}
      <ViewGroupModal
        open={openViewModal}
        onClose={() => setOpenViewModal(false)}
        group={group}
      />

      <EditGroupModal
        open={openEditModal}
        onOpenChange={setOpenEditModal}
        group={group}
        onSuccess={fetchGroup}
      />
    </div>
  );
}
