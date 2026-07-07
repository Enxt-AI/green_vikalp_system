"use client";

import { MobileHeader } from "@/components/mobile/header";
import { GitMerge, Plus, Play, Pause, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileWorkflowPage() {
  const router = useRouter();

  const workflows = [
    { id: 1, name: "New Lead Welcome", status: "Active", trigger: "Lead Created" },
    { id: 2, name: "Meeting Reminder", status: "Active", trigger: "24h before meeting" },
    { id: 3, name: "Inactive Lead Follow-up", status: "Paused", trigger: "No contact in 30 days" },
  ];

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 pb-[70px]">
      <MobileHeader 
        title="Workflows" 
        showBack={true} 
        rightActions={
          <button 
            onClick={() => router.push('/workflow/create')}
            className="h-8 w-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mr-1 shadow-sm border border-brand-100/50 active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-neutral-100">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Active</p>
            <p className="text-2xl font-bold text-neutral-900">2</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-neutral-100">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Paused</p>
            <p className="text-2xl font-bold text-neutral-900">1</p>
          </div>
        </div>

        <div className="space-y-3">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.08)] border border-neutral-100 p-4 active:bg-neutral-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    workflow.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    <GitMerge className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{workflow.name}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${workflow.status === 'Active' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                      {workflow.status}
                    </p>
                  </div>
                </div>
                <button className="h-8 w-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 active:bg-neutral-100 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Trigger</p>
                  <p className="text-sm text-neutral-700 font-medium">{workflow.trigger}</p>
                </div>
                
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  workflow.status === 'Active' 
                    ? 'bg-amber-50 text-amber-600 active:bg-amber-100' 
                    : 'bg-emerald-50 text-emerald-600 active:bg-emerald-100'
                }`}>
                  {workflow.status === 'Active' ? (
                    <><Pause className="h-3 w-3" /> Pause</>
                  ) : (
                    <><Play className="h-3 w-3" /> Resume</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
