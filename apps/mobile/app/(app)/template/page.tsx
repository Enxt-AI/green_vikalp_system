"use client";

import { MobileHeader } from "@/components/mobile/header";
import { LayoutTemplate, Plus, FileText, Mail, MessageSquare, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export default function MobileTemplatePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const templates = [
    { id: 1, name: "Initial Welcome Email", type: "Email", icon: Mail, description: "Sent to new leads upon registration" },
    { id: 2, name: "Meeting Confirmation", type: "SMS", icon: MessageSquare, description: "Reminder text sent 24h before meeting" },
    { id: 3, name: "Property Brochure", type: "Document", icon: FileText, description: "Standard property details layout" },
  ];

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 pb-[70px]">
      <MobileHeader 
        title="Templates" 
        showBack={true} 
        rightActions={
          <button className="h-8 w-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mr-1 shadow-sm border border-brand-100/50 active:scale-95 transition-transform">
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white shadow-sm"
          />
        </div>

        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.08)] border border-neutral-100 p-4 active:bg-neutral-50 transition-colors flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                <template.icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900 truncate">{template.name}</h3>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">{template.description}</p>
                <div className="mt-2 flex items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 uppercase tracking-wider">
                    {template.type}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <button className="h-8 w-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 active:bg-neutral-100 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
