"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { campaigns as campaignsApi, type Campaign, type Lead } from "@/lib/api";
import { MobileHeader } from "@/components/mobile/header";
import { Button } from "@/components/ui/button";

export default function CampaignDetailsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    
    // Check role: ADMIN or MANAGER
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [campaignData, leadsData] = await Promise.all([
          campaignsApi.get(id),
          campaignsApi.getLeads(id)
        ]);
        setCampaign(campaignData);
        setLeads(leadsData);
      } catch (error) {
        console.error("Failed to fetch campaign data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, isAuthLoading, user]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50/50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return (
      <div className="flex h-screen flex-col bg-neutral-50/50">
        <MobileHeader title="Access Denied" />
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-lg text-red-600 font-semibold">Access Denied: Only Admins/Managers can view details.</p>
        </div>
        <Button onClick={() => router.back()} className="m-4">Go Back</Button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-screen flex-col bg-neutral-50/50">
        <MobileHeader title="Campaign Not Found" />
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-lg text-neutral-900">Campaign not found.</p>
        </div>
        <Button onClick={() => router.back()} className="m-4">Go Back</Button>
      </div>
    );
  }

  const activeLeads = leads.filter(l => !l.isArchived);
  const wonLeads = leads.filter(l => l.currentStage.name.toLowerCase().includes("won"));
  const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 pb-[70px]">
      <MobileHeader title="Campaign Overview" />
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Campaign Info */}
        <div className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 p-5">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-1 tracking-tight">{campaign.name}</h1>
          <p className="text-neutral-500 text-sm mb-4">{campaign.description || "No description provided."}</p>
          
          <div className="flex items-center gap-2 mb-6">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              campaign.status === "ACTIVE" ? "bg-green-100 text-green-700" :
              campaign.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
              "bg-neutral-100 text-neutral-600"
            }`}>
              {campaign.status}
            </span>
            <span className="text-xs font-medium bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
              {campaign.source.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 mt-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Total Budget</p>
              <p className="text-lg font-semibold text-neutral-900">₹ {campaign.budget || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Spent</p>
              <p className="text-lg font-semibold text-neutral-900">₹ {campaign.actualSpend || 0}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Total Leads</p>
            <p className="text-2xl font-semibold text-neutral-900">{leads.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Active Leads</p>
            <p className="text-2xl font-semibold text-neutral-900">{activeLeads.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Conversion Rate</p>
            <p className="text-2xl font-semibold text-green-600">{conversionRate}%</p>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 p-5">
          <h3 className="font-semibold text-neutral-900 mb-3 tracking-tight">Team Members</h3>
          <div className="space-y-3">
            {campaign.assignedTo?.map((member) => (
              <div key={member.id} className="flex justify-between items-center text-sm border-b border-neutral-100 last:border-0 pb-3 last:pb-0">
                <span className="text-neutral-900 font-medium">{member.fullName}</span>
                <span className="text-neutral-500 text-xs">{member.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}