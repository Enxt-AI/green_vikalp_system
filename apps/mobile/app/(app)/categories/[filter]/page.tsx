"use client";

import { useDeferredValue, useEffect, useMemo, useState, useCallback } from "react";
import { MobileHeader } from "@/components/mobile/header";
import {
  leads as leadsApi,
  campaigns as campaignsApi,
  auth,
  type Lead,
  type Campaign,
  type LeadType,
  type Priority,
  type User,
} from "@/lib/api";
import { CACHE_TTLS, useCachedFetch } from "@/lib/cached-fetch";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Phone, Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 10;

const LEAD_TYPE_OPTIONS: { value: LeadType; label: string }[] = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "INVESTOR", label: "Investor" },
  { value: "RENTER", label: "Renter" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "LOW", label: "Low", color: "bg-neutral-400" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "URGENT", label: "Urgent", color: "bg-red-500" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

export default function LeadListPage() {
  const { filter } = useParams();
  const { user } = useAuth();

  // Search
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);

  // Filter values (matching desktop leads page)
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [filterLeadType, setFilterLeadType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Check whether any filters are active (for the dot indicator)
  const hasActiveFilters =
    filterCampaign !== "all" ||
    filterLeadType !== "all" ||
    filterPriority !== "all" ||
    filterDateRange !== "all" ||
    filterEmployee !== "all";

  // Count active filters for the badge
  const activeFilterCount = [
    filterCampaign !== "all",
    filterLeadType !== "all",
    filterPriority !== "all",
    filterDateRange !== "all",
    filterEmployee !== "all",
  ].filter(Boolean).length;

  // Fetch campaigns
  const { data: campaignsData } = useCachedFetch<Campaign[]>(
    "campaigns:all",
    () => campaignsApi.list(),
    { ttl: CACHE_TTLS.reference }
  );
  const campaigns = campaignsData ?? [];

  // Fetch team members (for ADMIN/MANAGER/TEAM_LEADER)
  const canViewTeam =
    user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "TEAM_LEADER";
  const { data: teamData } = useCachedFetch<User[]>(
    canViewTeam ? "users:active" : null,
    () => auth.listUsers().then((users) => users.filter((u) => u.isActive)),
    { ttl: CACHE_TTLS.reference, enabled: canViewTeam }
  );
  const teamMembers = teamData ?? [];

  // Fetch all leads
  const { data: allLeadsData, loading: isLoading } = useCachedFetch<Lead[]>(
    "leads:all",
    () => leadsApi.list(),
    { ttl: CACHE_TTLS.realtime }
  );
  const allLeads = allLeadsData ?? [];

  const titleMap: Record<string, string> = {
    all: "All Leads",
    uncontacted: "Uncontacted Leads",
    "in-progress": "In-Progress Leads",
    "follow-up": "Follow-up Leads",
    "not-connected": "Not Connected",
  };

  const isDynamicStage = (filter as string).startsWith("stage-");
  const stageId = isDynamicStage ? (filter as string).replace("stage-", "") : null;

  // Apply category filter first, then overlay the additional filters
  const leads = useMemo(() => {
    let filtered = allLeads;

    // 1. Category filter (from URL slug)
    if (isDynamicStage && stageId) {
      filtered = filtered.filter((l) => l.currentStage.id === stageId);
    } else if (filter === "uncontacted") {
      filtered = filtered.filter(
        (l) =>
          ["new", "uncontacted", "leads"].includes(l.currentStage.name.toLowerCase()) ||
          l.lastContactedAt === null
      );
    } else if (filter === "in-progress") {
      filtered = filtered.filter(
        (l) =>
          !["new", "uncontacted", "leads", "won", "lost", "closed won", "closed lost", "archived"].includes(
            l.currentStage.name.toLowerCase()
          )
      );
    } else if (filter === "follow-up") {
      filtered = filtered.filter((l) => l.nextFollowUpAt !== null);
    } else if (filter === "not-connected") {
      filtered = filtered.filter((l) =>
        ["not connected", "call not connected", "disconnected"].includes(l.currentStage.name.toLowerCase())
      );
    }

    // 2. Campaign filter
    if (filterCampaign !== "all") {
      filtered = filtered.filter((l) => l.campaign?.id === filterCampaign);
    }

    // 3. Lead type filter
    if (filterLeadType !== "all") {
      filtered = filtered.filter((l) => l.leadType === filterLeadType);
    }

    // 4. Priority filter
    if (filterPriority !== "all") {
      filtered = filtered.filter((l) => l.priority === filterPriority);
    }

    // 5. Employee / assigned-to filter
    if (filterEmployee !== "all") {
      filtered = filtered.filter((l) => l.assignedTo?.id === filterEmployee);
    }

    // 6. Date range filter
    if (filterDateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let from: Date | null = null;
      let to: Date | null = null;

      if (filterDateRange === "today") {
        from = today;
      } else if (filterDateRange === "yesterday") {
        from = new Date(today);
        from.setDate(from.getDate() - 1);
        to = today;
      } else if (filterDateRange === "7days") {
        from = new Date(today);
        from.setDate(from.getDate() - 7);
      } else if (filterDateRange === "30days") {
        from = new Date(today);
        from.setDate(from.getDate() - 30);
      } else if (filterDateRange === "thisMonth") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filterDateRange === "custom") {
        if (customStartDate) {
          from = new Date(customStartDate);
          from.setHours(0, 0, 0, 0);
        }
        if (customEndDate) {
          to = new Date(customEndDate);
          to.setHours(23, 59, 59, 999);
        }
      }

      if (from) {
        filtered = filtered.filter((l) => new Date(l.createdAt) >= from!);
      }
      if (to) {
        filtered = filtered.filter((l) => new Date(l.createdAt) <= to!);
      }
    }

    return filtered;
  }, [allLeads, filter, isDynamicStage, stageId, filterCampaign, filterLeadType, filterPriority, filterEmployee, filterDateRange, customStartDate, customEndDate]);

  const title = titleMap[filter as string] || (leads.length > 0 ? leads[0].currentStage.name : "Leads");

  const q = deferredSearch.trim().toLowerCase();
  const filteredLeads =
    q === ""
      ? leads
      : leads.filter(
          (l) =>
            l.firstName.toLowerCase().includes(q) ||
            l.lastName.toLowerCase().includes(q) ||
            (l.mobile && l.mobile.includes(deferredSearch.trim()))
        );

  // Category filters are custom client-side logic the API can't express, so
  // the cached list is paged locally: 10 rendered at a time.
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to first page whenever category, search, or filters change
  useEffect(() => {
    setPage(1);
  }, [filter, deferredSearch, filterCampaign, filterLeadType, filterPriority, filterEmployee, filterDateRange, customStartDate, customEndDate]);

  const clearAllFilters = useCallback(() => {
    setFilterCampaign("all");
    setFilterLeadType("all");
    setFilterPriority("all");
    setFilterDateRange("all");
    setFilterEmployee("all");
    setCustomStartDate("");
    setCustomEndDate("");
  }, []);

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 relative pb-[70px]">
      <MobileHeader
        title={title}
        onFilterClick={() => setShowFilters((v) => !v)}
        filterActive={hasActiveFilters}
      />

      {/* Search bar */}
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

      {/* Filter panel – slides down from header */}
      {showFilters && (
        <div className="bg-white border-b border-neutral-200/60 shadow-lg animate-in slide-in-from-top-2 duration-200 relative z-[9]">
          <div className="p-4 space-y-4">
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-700">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-bold text-blue-700">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-medium text-blue-600 active:text-blue-800 transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="rounded-full p-1 hover:bg-neutral-100 text-neutral-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Campaign filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Campaign
              </label>
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-neutral-50 border-neutral-200">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead type filter – pill chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Lead Type
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterLeadType("all")}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    filterLeadType === "all"
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  All
                </button>
                {LEAD_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterLeadType(opt.value)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      filterLeadType === opt.value
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority filter – pill chips with color dots */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterPriority("all")}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    filterPriority === "all"
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  All
                </button>
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterPriority(opt.value)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      filterPriority === opt.value
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        filterPriority === opt.value ? "bg-white" : opt.color
                      }`}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Date Range
              </label>
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-neutral-50 border-neutral-200">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom date range inputs */}
            {filterDateRange === "custom" && (
              <div className="flex gap-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-neutral-500">Start</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-11 rounded-xl bg-neutral-50 border-neutral-200"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-neutral-500">End</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-11 rounded-xl bg-neutral-50 border-neutral-200"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
                    className="self-end mb-1 rounded-full p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Employee / Assigned To filter (role-gated) */}
            {canViewTeam && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Assigned To
                </label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-neutral-50 border-neutral-200">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Results summary */}
            <div className="pt-2 border-t border-neutral-100">
              <p className="text-xs font-medium text-neutral-400">
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips (shown below search when panel is collapsed) */}
      {!showFilters && hasActiveFilters && (
        <div className="px-4 py-2 bg-white border-b border-neutral-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filterCampaign !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium whitespace-nowrap">
              {campaigns.find((c) => c.id === filterCampaign)?.name || "Campaign"}
              <button onClick={() => setFilterCampaign("all")} className="ml-0.5 hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterLeadType !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium whitespace-nowrap">
              {LEAD_TYPE_OPTIONS.find((o) => o.value === filterLeadType)?.label}
              <button onClick={() => setFilterLeadType("all")} className="ml-0.5 hover:text-purple-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterPriority !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium whitespace-nowrap">
              {PRIORITY_OPTIONS.find((o) => o.value === filterPriority)?.label}
              <button onClick={() => setFilterPriority("all")} className="ml-0.5 hover:text-orange-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterDateRange !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium whitespace-nowrap">
              {DATE_RANGE_OPTIONS.find((o) => o.value === filterDateRange)?.label}
              <button onClick={() => { setFilterDateRange("all"); setCustomStartDate(""); setCustomEndDate(""); }} className="ml-0.5 hover:text-green-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterEmployee !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium whitespace-nowrap">
              {teamMembers.find((m) => m.id === filterEmployee)?.fullName || "Employee"}
              <button onClick={() => setFilterEmployee("all")} className="ml-0.5 hover:text-teal-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-600 whitespace-nowrap transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-[100px]">
        {isLoading ? (
          <CardListSkeleton count={5} />
        ) : filteredLeads.length === 0 ? (
          <div className="text-center p-8 text-neutral-400 font-medium">
            {hasActiveFilters ? (
              <div className="space-y-3">
                <p>No leads match your filters</p>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 font-medium active:text-blue-800"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              "No leads found"
            )}
          </div>
        ) : (
          <>
          {totalPages > 1 && (
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
            </p>
          )}
          {pagedLeads.map(lead => (
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
                {/* Extra info row: lead type + priority badges */}
                <div className="flex items-center gap-2 mt-2">
                  {lead.leadType && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
                      {lead.leadType}
                    </span>
                  )}
                  {lead.priority && lead.priority !== "MEDIUM" && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      lead.priority === "URGENT" ? "bg-red-50 text-red-600" :
                      lead.priority === "HIGH" ? "bg-orange-50 text-orange-600" :
                      "bg-neutral-100 text-neutral-500"
                    }`}>
                      {lead.priority}
                    </span>
                  )}
                  {lead.campaign?.name && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-neutral-400 bg-neutral-50 truncate max-w-[120px]">
                      {lead.campaign.name}
                    </span>
                  )}
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
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200/60 bg-white p-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl font-semibold disabled:opacity-50"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </Button>
              <span className="text-sm font-semibold text-neutral-700 whitespace-nowrap">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl font-semibold disabled:opacity-50"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </Button>
            </div>
          )}
          </>
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
