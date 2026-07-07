"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { leads as leadsApi, type Lead } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LeadListPage() {
  const { filter } = useParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const titleMap: Record<string, string> = {
    all: "All Leads",
    uncontacted: "Uncontacted Leads",
    "in-progress": "In-Progress Leads",
    "follow-up": "Follow-up Leads",
    "not-connected": "Not Connected",
  };

  const isDynamicStage = (filter as string).startsWith("stage-");
  const stageId = isDynamicStage ? (filter as string).replace("stage-", "") : null;
  const title = titleMap[filter as string] || (leads.length > 0 ? leads[0].currentStage.name : "Leads");

  useEffect(() => {
    async function loadLeads() {
      try {
        setIsLoading(true);
        const data = await leadsApi.list();

        let filtered = data;
        if (isDynamicStage && stageId) {
          filtered = data.filter(l => l.currentStage.id === stageId);
        } else if (filter === "uncontacted") {
          filtered = data.filter(l =>
            ["new", "uncontacted", "leads"].includes(l.currentStage.name.toLowerCase()) ||
            l.lastContactedAt === null
          );
        } else if (filter === "in-progress") {
          filtered = data.filter(l =>
            !["new", "uncontacted", "leads", "won", "lost", "closed won", "closed lost", "archived"].includes(l.currentStage.name.toLowerCase())
          );
        } else if (filter === "follow-up") {
          filtered = data.filter(l => l.nextFollowUpAt !== null);
        } else if (filter === "not-connected") {
          filtered = data.filter(l =>
            ["not connected", "call not connected", "disconnected"].includes(l.currentStage.name.toLowerCase())
          );
        }
        setLeads(filtered);
      } catch (error) {
        toast.error("Failed to fetch leads");
      } finally {
        setIsLoading(false);
      }
    }
    loadLeads();
  }, [filter]);

  const filteredLeads = leads.filter(l =>
    l.firstName.toLowerCase().includes(search.toLowerCase()) ||
    l.lastName.toLowerCase().includes(search.toLowerCase()) ||
    (l.mobile && l.mobile.includes(search))
  );

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 relative pb-[70px]">
      <MobileHeader title={title} />

      <div className="p-4 bg-white border-b border-neutral-200/60 relative z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            className="pl-9 h-12 rounded-xl bg-neutral-100 border-transparent focus:border-neutral-300 focus:bg-white transition-colors text-base"
            placeholder="Search leads by name or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-[100px]">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center p-8 text-neutral-400 font-medium">No leads found</div>
        ) : (
          filteredLeads.map(lead => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="block">
              <div className="bg-white rounded-2xl p-5 shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 active:bg-neutral-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-neutral-900 text-lg tracking-tight">{lead.firstName} {lead.lastName}</h3>
                    <p className="text-sm text-neutral-500 font-medium mt-0.5">{lead.mobile || "No number"}</p>
                  </div>
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                    {lead.currentStage.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-100">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-neutral-700">{lead.firstName[0]}</span>
                  </div>
                  <div className="text-xs font-medium text-neutral-500 line-clamp-1">
                    Assigned to <span className="text-neutral-900">{lead.assignedTo?.fullName || "Unassigned"}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Sticky Bottom Action */}
      <div className="absolute bottom-[80px] left-5 right-5 z-20">
        <Button className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-[0_0_20px_rgba(0,0,0,0.2)] text-base font-semibold flex items-center gap-2 transition-transform active:scale-95">
          <Phone className="h-5 w-5 fill-white" />
          Start Calling
        </Button>
      </div>
    </div>
  );
}
