"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/mobile/header";
import { campaigns as campaignsApi, type Campaign } from "@/lib/api";
import { Megaphone, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const data = await campaignsApi.list();
        setCampaigns(data);
      } catch (error) {
        console.error("Failed to fetch campaigns", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 relative pb-[70px]">
      <MobileHeader 
        title="My Campaigns" 
        rightActions={
          <button className="rounded-full p-2 hover:bg-neutral-100 text-neutral-600 transition-colors">
            <Search className="h-5 w-5" />
          </button>
        }
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-6 shadow-inner">
            <Megaphone className="h-16 w-16 text-neutral-400" strokeWidth={2} />
          </div>
          <p className="text-lg font-medium text-neutral-900">No campaigns found.</p>
          <p className="text-sm text-neutral-500 mt-1">You don't have any active campaigns right now.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-[80px]">
          {campaigns.map((campaign) => (
            <div 
              key={campaign.id}
              className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 p-5 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 mb-1.5 tracking-tight">{campaign.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      campaign.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      campaign.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>
                      {campaign.status}
                    </span>
                    <span className="text-xs font-medium text-neutral-500">{campaign.source.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 mt-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Total Leads</p>
                  <p className="text-xl font-semibold text-neutral-900">{campaign._count?.leads || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Budget</p>
                  <p className="text-xl font-semibold text-neutral-900">₹ {campaign.budget || 0}</p>
                </div>
              </div>
              
              <Button 
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
                variant="outline"
                className="w-full mt-5 h-12 border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-medium text-base rounded-xl"
              >
                View Details
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
