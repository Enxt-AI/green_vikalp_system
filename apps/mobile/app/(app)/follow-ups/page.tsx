"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { ChevronDown, PhoneCall } from "lucide-react";
import { tasks as tasksApi, type Task } from "@/lib/api";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowUps() {
      try {
        const data = await tasksApi.followUps.list();
        
        // Filter for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = data.filter((followUp: any) => {
          const d = new Date(followUp.nextFollowUpAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });
        
        setFollowUps(filtered);
      } catch (error) {
        console.error("Failed to fetch follow ups", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFollowUps();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="Follow-up" />

      <div className="flex flex-col flex-1">
        {/* Filters */}
        <div className="flex gap-2 p-4 bg-white border-b border-brand-100">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-brand-200 bg-white">
            <span className="text-sm font-medium text-brand-900">Today</span>
            <ChevronDown className="h-4 w-4 text-brand-400" />
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-brand-200 bg-white">
            <span className="text-sm font-medium text-brand-900">Follow-up Type</span>
            <ChevronDown className="h-4 w-4 text-brand-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
             <div className="flex justify-center p-8">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
             </div>
          ) : followUps.length === 0 ? (
            <div className="flex flex-1 h-[60vh] flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-brand-100 p-6 shadow-inner">
                <PhoneCall className="h-16 w-16 text-brand-600 rotate-[-15deg]" strokeWidth={2.5} />
              </div>
              <p className="text-lg text-brand-900">No follow-ups due Today</p>
            </div>
          ) : (
            followUps.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200/60 active:bg-neutral-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-neutral-900 text-lg tracking-tight">{lead.firstName} {lead.lastName}</h3>
                      <p className="text-sm text-neutral-500 font-medium mt-0.5">{lead.mobile || "No number"}</p>
                    </div>
                    {lead.priority && (
                       <Badge className={
                         lead.priority === 'HIGH' || lead.priority === 'URGENT' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                         lead.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                         'bg-neutral-100 text-neutral-700 hover:bg-neutral-100'
                       }>
                         {lead.priority}
                       </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100">
                     <div className="text-xs font-medium text-neutral-500">
                       Time: <span className="text-neutral-900">{new Date(lead.nextFollowUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
