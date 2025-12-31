"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, Loader } from "lucide-react";
import { notificationService } from "@/lib/api/notification";

interface Notification {
    id: string;
    title: string;
    message: string;
    entity: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationPanel() {
    const [tab, setTab] = useState("all");
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const response = await notificationService.getAllNotifications(1, 100);
            
            if (response.success && response.data) {
                setNotifications(response.data.notifications || []);
                setUnreadCount(response.data.notifications?.filter((n: Notification) => !n.isRead).length || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ FILTER LOGIC
    const filtered =
        tab === "all"
            ? notifications
            : tab === "unread"
                ? notifications.filter((n) => !n.isRead)
                : notifications.filter((n) => n.isRead);

    // ✅ DELETE NOTIFICATION
    const handleDelete = async (id: string) => {
        try {
            const response = await notificationService.deleteNotification(id);
            
            if (response.success) {
                setNotifications(notifications.filter((n) => n.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    // ✅ MARK AS READ
    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await notificationService.markAsRead(id);
            
            if (response.success) {
                setNotifications(
                    notifications.map((n) =>
                        n.id === id ? { ...n, isRead: true } : n
                    )
                );
                setUnreadCount(Math.max(0, unreadCount - 1));
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // ✅ MARK ALL AS READ
    const handleMarkAllAsRead = async () => {
        try {
            const response = await notificationService.markAllAsRead();
            
            if (response.success) {
                setNotifications(
                    notifications.map((n) => ({ ...n, isRead: true }))
                );
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // ✅ CLEAR ALL NOTIFICATIONS
    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete all notifications?')) return;
        
        try {
            const response = await notificationService.clearAllNotifications();
            
            if (response.success) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to clear all notifications:', error);
        }
    };

    // ✅ FORMAT DATE
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    // ✅ GET ENTITY BADGE COLOR
    const getEntityColor = (entity: string) => {
        const colors: { [key: string]: string } = {
            USER: "bg-blue-100 text-blue-700",
            NURSERY: "bg-green-100 text-green-700",
            GROUP: "bg-purple-100 text-purple-700",
            REVIEW: "bg-orange-100 text-orange-700",
        };
        return colors[entity] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">

            {/* ✅ Header Card */}
            <div className="bg-white py-6 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pr-4 gap-4">
                    <CardHeader className="">
                        <div className="flex items-center gap-2">
                            <Bell className="w-8 h-8" />
                            <CardTitle className="font-sans text-2xl md:text-4xl text-gray-500 font-heading text-secondary">NOTIFICATIONS</CardTitle>
                        </div>
                        <p>{unreadCount} unread notifications</p>
                    </CardHeader>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition w-full sm:w-auto"
                        >
                            <Check className="w-5 h-5" />
                            Mark as Read
                        </button>

                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition w-full sm:w-auto"
                        >
                            <Trash2 className="w-5 h-5" />
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ Tabs Card */}
            <Card className="">
                <CardHeader>
                    <CardTitle className="font-sans text-lg text-gray-500">Read status</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={tab} onValueChange={setTab} className="w-full">
                        <TabsList className="grid grid-cols-3 w-1/2 gap-2 bg-white">
                            <TabsTrigger
                                value="all"
                                className="rounded-sm border border-gray-300 text-gray-500 data-[state=active]:bg-secondary data-[state=active]:text-white"
                            >
                                All
                            </TabsTrigger>

                            <TabsTrigger
                                value="unread"
                                className="rounded-sm border border-gray-300 text-gray-500 data-[state=active]:bg-secondary data-[state=active]:text-white"
                            >
                                Unread
                            </TabsTrigger>

                            <TabsTrigger
                                value="read"
                                className="rounded-sm border border-gray-300 text-gray-500 data-[state=active]:bg-secondary data-[state=active]:text-white"
                            >
                                Read
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardContent>
            </Card>

            {/* ✅ Notifications List Card */}
            <Card className="">
                <CardHeader>
                    <CardTitle>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} Notifications
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader className="w-6 h-6 animate-spin text-gray-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">
                            No notifications found.
                        </p>
                    ) : (
                        filtered.map((n) => (
                            <div
                                key={n.id}
                                className={`flex justify-between items-start p-4 rounded-lg border hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50 border-blue-200' : ''}`}
                            >
                                <div className="space-y-1 flex-1">
                                    <p className="font-semibold text-gray-900">{n.title}</p>
                                    <p className="text-sm text-gray-700">{n.message}</p>

                                    <div className="flex items-center gap-3 mt-2">
                                        <Badge className={getEntityColor(n.entity)}>
                                            {n.entity}
                                        </Badge>
                                        <p className="text-xs text-gray-500">{formatDate(n.createdAt)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 ml-4">
                                    {!n.isRead && (
                                        <button 
                                            onClick={() => handleMarkAsRead(n.id)}
                                            className="p-2 hover:bg-blue-100 rounded transition"
                                            title="Mark as read"
                                        >
                                            <Check className="w-4 h-4 text-blue-600" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(n.id)}
                                        className="p-2 hover:bg-red-100 rounded transition"
                                        title="Delete notification"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
