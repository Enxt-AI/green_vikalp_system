"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { interactions as interactionsApi, type Interaction } from "@/lib/api";
import { PhoneCall, PhoneMissed, Clock, History, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CallLogsPage() {
  const [logs, setLogs] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCallLogs() {
      try {
        const data = await interactionsApi.list({ type: "CALL" });
        setLogs(data);
      } catch (error) {
        console.error("Failed to fetch call logs", error);
        toast.error("Failed to load call history");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCallLogs();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="Call Logs" />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-brand-100 p-6 shadow-inner">
            <History className="h-16 w-16 text-brand-600" strokeWidth={2.5} />
          </div>
          <p className="text-lg font-semibold text-brand-900 mb-1">No call history</p>
          <p className="text-brand-500 text-sm">Your outbound and inbound calls will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[80px]">
          {logs.map((log) => {
            const isConnected = log.subject === "Call - Connected" || (log.duration && log.duration > 0);
            
            return (
              <Link 
                href={`/leads/${log.leadId}`} 
                key={log.id}
                className="bg-white rounded-xl shadow-sm border border-brand-100 p-4 flex items-center gap-4 transition-colors active:bg-brand-50 block"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isConnected ? 'bg-green-50' : 'bg-red-50'}`}>
                  {isConnected ? (
                    <PhoneCall className={`h-5 w-5 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
                  ) : (
                    <PhoneMissed className={`h-5 w-5 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-base text-brand-950 truncate pr-2">
                      {log.lead ? `${log.lead.firstName} ${log.lead.lastName}` : "Unknown Lead"}
                    </h3>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-brand-500">
                        {formatTime(log.occurredAt)}
                      </span>
                      <span className="text-[10px] font-medium text-brand-400 mt-0.5 uppercase tracking-wider">
                        {formatDate(log.occurredAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isConnected ? 'Connected' : 'Unconnected'}
                    </span>
                    {log.duration && log.duration > 0 && (
                      <div className="flex items-center gap-1 text-xs text-brand-500 font-medium bg-brand-50 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" />
                        <span>{Math.floor(log.duration / 60)}m {log.duration % 60}s</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="h-5 w-5 text-brand-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
