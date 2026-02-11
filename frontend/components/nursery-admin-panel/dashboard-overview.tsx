"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { adminService } from "@/lib/api/admin";
import { useMonthlyUserStats, useMonthlyReviewStats } from "@/hooks/use-chart-analytics";
import { Building2, Users, FileText, Clock } from "lucide-react";

const subscriptionData = [
  { name: "Active", value: 65 },
  { name: "Expired", value: 25 },
  { name: "Trial", value: 10 },
];

const COLORS = ["#38bdf8", "#6366f1", "#3b82f6"];

const recentActivity = [
  { text: "User Ahmad submitted a new review.", time: "2 hours ago" },
  { text: "New subscription activated by Sara.", time: "5 hours ago" },
  { text: "User John updated profile info.", time: "1 day ago" },
  { text: "System maintenance performed.", time: "2 days ago" },
];

export default function DashboardCharts() {
  const [stats, setStats] = useState({
    totalNurseries: 0,
    totalGroups: 0,
    totalUsers: 0,
    totalReviews: 0,
    rejectedReviews: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const { data: monthlyUserData, total: totalMonthlyUsers, loading: userLoading, error: userError } = useMonthlyUserStats(12);
  const { data: monthlyReviewData, total: totalMonthlyReviews, loading: reviewLoading, error: reviewError } = useMonthlyReviewStats(12);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminService.getStats();
      if (response.success && response.data) {
        setStats(response.data as any);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">

      {/* WELCOME CARD */}
      <div className="shadow-md w-full rounded-lg p-4 text-white bg-white">
      
        <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
        <span className="text-foreground">WELCOME BACK, </span>ADMIN
      </h2>
          <p className="text-lg opacity-90 text-foreground">Manage your workspace with confidence.</p>
       
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nurseries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalNurseries}</div>
            <p className="text-xs text-muted-foreground">Active nurseries</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">Parent groups</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">All reviews</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.rejectedReviews}</div>
            <p className="text-xs text-muted-foreground">Admin rejected</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-1">Approvals Needed</div>
            <div className="text-2xl font-bold">{loading ? '...' : stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 1 */}
      <div className="flex flex-col lg:flex-row gap-2 w-full">

        {/* USER GROWTH */}
        <Card className="flex-1 shadow-md">
          <CardHeader>
            <CardTitle>New Users Over Time</CardTitle>
             <CardDescription>Monthly user registrations (Last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {userLoading ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            ) : userError ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-500 font-medium">Error loading data</p>
                  <p className="text-sm text-muted-foreground">{userError}</p>
                </div>
              </div>
            ) : monthlyUserData && monthlyUserData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyUserData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#04B0D6"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* REVIEWS */}
        <Card className="flex-1 shadow-md">
          <CardHeader>
            <CardTitle>Reviews Trend</CardTitle>
              <CardDescription>Monthly reviews submitted (Last 12 months)</CardDescription>
          </CardHeader>
          <CardContent className="w-full">
            {reviewLoading ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            ) : reviewError ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-500 font-medium">Error loading data</p>
                  <p className="text-sm text-muted-foreground">{reviewError}</p>
                </div>
              </div>
            ) : monthlyReviewData && monthlyReviewData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyReviewData} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reviews" fill="#04B0D6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ROW 2 */}
      <div className="flex flex-col lg:flex-row gap-2 w-full">

        {/* SUBSCRIPTION PIE */}
        <Card className="flex-1 shadow-md relative">
  <CardHeader>
    <CardTitle>Active Subscription Status</CardTitle>
    <CardDescription>Active subscriptions by plan type</CardDescription>
  </CardHeader>

  <CardContent className="relative">
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={subscriptionData}
          cx="50%"
          cy="50%"
          innerRadius={55}        // 👈 donut hole
          outerRadius={85}        // 👈 outer radius slightly bigger than before
          paddingAngle={3}        // 👈 smooth spacing
          dataKey="value"
        >
          {subscriptionData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index]}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>

    {/* ✅ Shadcn-style center text */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <p className="text-3xl font-bold">
          {subscriptionData.find((d) => d.name === "Active")?.value}%
        </p>
        <p className="text-sm text-muted-foreground">Active</p>
      </div>
    </div>
  </CardContent>
</Card>


        {/* RECENT ACTIVITY */}
        <Card className="flex-1 shadow-md">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentActivity.map((item, index) => (
                <li
                  key={index}
                  className="p-3 border rounded-md  transition flex flex-col"
                >
                  <span className="font-medium">{item.text}</span>
                  <span className="text-gray-500 text-sm">{item.time}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
