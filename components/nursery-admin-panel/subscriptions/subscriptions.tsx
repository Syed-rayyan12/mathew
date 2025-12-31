"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Subscriptions() {
  const [tab, setTab] = useState("all");

  const tabOptions = [
    { value: "all", label: "Active Subscription" },
    { value: "unread", label: "Invoice History" },
    { value: "read", label: "Plans & Pricing" },
  ];

  const handleStatusChange = (id: number, value: string) => {
    console.log(`Status for ID ${id} changed to ${value}`);
  };

  // ✅ Active subscriptions
  const billingData = [
    { id: 1, group: "Little Learners", plan: "Premium", billing:"15 nov 2025", amount: "$49", status: "Active" },
    { id: 2, group: "Tiny Stars", plan: "Standard", billing:"12 oct 2025", amount: "$29", status: "Paused" },
    { id: 3, group: "Bright Minds", plan: "Basic", billing:"11 dec 2025", amount: "$19", status: "Cancelled" },
  ];

  // ✅ Invoice history
  const invoices = [
    { id: 1, group: "Little Learners", date: "Oct 21, 2025", amount: "$49", status: "Paid" },
    { id: 2, group: "Tiny Stars", date: "Sep 21, 2025", amount: "$29", status: "Pending" },
    { id: 3, group: "Bright Minds", date: "Aug 21, 2025", amount: "$19", status: "Failed" },
  ];

  // ✅ Badge Colors
  const statusColor: any = {
    Paid: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Failed: "bg-red-100 text-red-700",
  };

   const statusColor2: any = {
    active: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    paused: "bg-gray-300 text-gray-300",
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* ✅ Header */}
      <div className="bg-white rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="px-6 py-4">
          <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
            <span className="text-foreground">SUBSCRIPTIONS</span> & BILLING
          </h2>
          <p>Manage plans, invoices, and payments</p>
        </div>

        <div className="flex items-center gap-3 pr-3 w-full md:w-auto">
          <button
            className="flex items-center gap-2 cursor-pointer
      px-4 py-2 rounded-md bg-secondary text-white hover:bg-red-700 transition w-full md:w-auto"
          >
            Generate Coupon
          </button>
        </div>
      </div>

      {/* ✅ Tabs/Select */}
      <Card>
        <CardContent>
          {/* Mobile/Tablet: Select Dropdown */}
          <div className="block lg:hidden">
            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tabs */}
          <div className="hidden lg:block">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid grid-cols-3 w-full gap-2 bg-[#EFEFEF]">
                {tabOptions.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    className="rounded-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-foreground"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* ✅ TAB 1 — Active Subscriptions Table */}
      {tab === "all" && (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                  <th className="p-3 text-left rounded-l-md">Group</th>
                  <th className="p-3 text-left">Plan</th>
                  <th className="p-3 text-left">Next Billing </th>
                   <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left rounded-r-md">Actions</th>
                </tr>
              </thead>

              <tbody>
                {billingData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-6 px-3 font-bold">{item.group}</td>
                    <td className="py-6 px-3 text-gray-500">{item.plan}</td>
                     <td className="py-6 px-3 text-gray-500">{item.billing}</td>
                    <td className="py-6 px-3 text-foreground">{item.amount}</td>

                      <td className="py-6 px-3">
                      <Badge className={`${statusColor2[item.status]} capitalize`}>
                        {item.status}
                      </Badge>
                    </td>

                    <td className="py-6 px-3 flex items-center gap-3">
                      <button>
                        <Pencil className="w-4 h-4 text-foreground" />
                      </button>
                      <button>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ TAB 2 — Invoice History Table */}
      {tab === "unread" && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
                  <th className="p-3 text-left rounded-l-md">Group</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  
                </tr>
              </thead>

              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-gray-50">
                    <td className="py-6 px-3 font-bold">{inv.group}</td>
                    <td className="py-6 px-3 text-gray-500">{inv.date}</td>
                    <td className="py-6 px-3 text-foreground">{inv.amount}</td>
                    <td className="py-6 px-3">
                      <Badge className={`${statusColor[inv.status]} capitalize`}>
                        {inv.status}
                      </Badge>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ TAB 3 — Plans & Pricing */}
      {tab === "read" && (
        <div className="grid bg-white grid-cols-1 md:grid-cols-3 gap-6 rounded-lg p-6">
          {/* Basic Plan */}
         
          <Card className="p-6 text-center border border-[#04B0D6] bg-[#DFF9FF] hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Basic Plan</CardTitle>
            </CardHeader>
            <CardContent className="">
              <p className="text-3xl font-semibold mb-2">$19/mo</p>
              <p className="text-gray-500 mb-4">For small nurseries</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✔ 10 Child Profiles</li>
                <li>✔ Basic Analytics</li>
                <li>✔ Email Support</li>
              </ul>
            </CardContent>
          </Card>

          {/* Standard Plan */}
          <Card className="p-6 text-center border border-[#04B0D6] bg-[#DFF9FF] hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Standard Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold mb-2">$29/mo</p>
              <p className="text-gray-500 mb-4">For growing nurseries</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✔ 50 Child Profiles</li>
                <li>✔ Advanced Reports</li>
                <li>✔ Priority Support</li>
              </ul>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="p-6 text-center border border-[#04B0D6] bg-[#DFF9FF] hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Premium Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold mb-2">$49/mo</p>
              <p className="text-gray-500 mb-4">For large nurseries</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✔ Unlimited Profiles</li>
                <li>✔ AI Insights</li>
                <li>✔ 24/7 Support</li>
              </ul>
            </CardContent>
          </Card>
       
        </div>
      )}
    </div>
  );
}
