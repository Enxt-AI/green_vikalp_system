"use client";

import { MobileHeader } from "@/components/mobile/header";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Phone } from "lucide-react";
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { leads as leadsApi, type Lead, type PagedResponse } from "@/lib/api";
import { CACHE_TTLS, useCachedFetch } from "@/lib/cached-fetch";
import { CardListSkeleton } from "@/components/ui/skeleton";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  // Debounced server search — avoids a request per keystroke
  const deferredQuery = useDeferredValue(query.trim());

  const { data: results, loading } = useCachedFetch<PagedResponse<Lead>>(
    deferredQuery === "" ? null : `search:leads:${deferredQuery}`,
    () => leadsApi.listPaged({ search: deferredQuery, limit: 10 }),
    { ttl: CACHE_TTLS.realtime }
  );
  const leads = results?.data ?? [];

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="Search" showBack={false} />

      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads by name or number..."
            className="h-14 pl-12 rounded-2xl border-brand-200 bg-white shadow-sm text-base focus-visible:ring-brand-500"
            autoFocus
          />
        </div>

        {deferredQuery === "" ? (
          /* Placeholder Content */
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
            <div className="h-20 w-20 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <SearchIcon className="h-8 w-8 text-brand-300" />
            </div>
            <h3 className="text-lg font-bold text-brand-900 mb-1">Looking for something?</h3>
            <p className="text-brand-500 max-w-[80%]">Type a name, phone number, or keyword in the search bar above.</p>
          </div>
        ) : loading && leads.length === 0 ? (
          <div className="mt-4 space-y-3">
            <CardListSkeleton count={3} />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
            <p className="text-lg font-bold text-brand-900 mb-1">No leads found</p>
            <p className="text-brand-500 max-w-[80%]">Try a different name or number.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pb-[80px]">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider">
              {results?.total ?? leads.length} result{(results?.total ?? 0) === 1 ? "" : "s"}
            </p>
            {leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200/60 active:bg-neutral-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-neutral-900 text-base tracking-tight">
                        {lead.firstName} {lead.lastName}
                      </h3>
                      <p className="text-sm text-neutral-500 font-medium mt-0.5">
                        {lead.mobile || lead.email || "No contact"}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                      {lead.currentStage.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 text-xs font-medium text-neutral-500">
                    <Phone className="h-3 w-3" />
                    Assigned to <span className="text-neutral-900">{lead.assignedTo?.fullName || "Unassigned"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
