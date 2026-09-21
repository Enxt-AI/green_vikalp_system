"use client";

import { useDeferredValue, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ImportLeadsDialog } from "@/components/import-leads-dialog";
import { EditLeadDialog } from "@/components/edit-lead-dialog";
import { leads as leadsApi, campaigns as campaignsApi, auth, type Lead, type Campaign, type LeadType, type Priority, type User, type PagedResponse, type LeadStats, type LeadListParams } from "@/lib/api";
import { CACHE_TTLS, invalidateCache, useCachedFetch } from "@/lib/cached-fetch";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const LEAD_TYPE_STYLES: Record<LeadType, string> = {
  BUYER: "bg-blue-100 text-blue-700 border-blue-200",
  SELLER: "bg-green-100 text-green-700 border-green-200",
  INVESTOR: "bg-purple-100 text-purple-700 border-purple-200",
  RENTER: "bg-amber-100 text-amber-700 border-amber-200",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-neutral-100 text-neutral-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get("campaignId");
  
  const PAGE_SIZE = 50;

  const [searchTerm, setSearchTerm] = useState("");
  // Debounced server search — avoids a request per keystroke
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [filterCampaign, setFilterCampaign] = useState<string>(campaignIdFromUrl || "all");
  const [filterLeadType, setFilterLeadType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [page, setPage] = useState(1);

  // Convert UI filters (incl. date presets) to server query params
  const serverFilters = useMemo<LeadListParams>(() => {
    const params: LeadListParams = {};
    if (filterCampaign !== "all") params.campaignId = filterCampaign;
    if (filterLeadType !== "all") params.leadType = filterLeadType as Lead["leadType"];
    if (filterPriority !== "all") params.priority = filterPriority as Priority;
    if (filterEmployee !== "all") params.assignedToId = filterEmployee;
    const q = deferredSearchTerm.trim();
    if (q !== "") params.search = q;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filterDateRange === "today") {
      params.from = today.toISOString();
    } else if (filterDateRange === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      params.from = yesterday.toISOString();
      params.to = today.toISOString();
    } else if (filterDateRange === "7days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      params.from = d.toISOString();
    } else if (filterDateRange === "30days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      params.from = d.toISOString();
    } else if (filterDateRange === "thisMonth") {
      params.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (filterDateRange === "custom") {
      if (customStartDate) {
        const s = new Date(customStartDate);
        s.setHours(0, 0, 0, 0);
        params.from = s.toISOString();
      }
      if (customEndDate) {
        const e = new Date(customEndDate);
        e.setHours(23, 59, 59, 999);
        params.to = e.toISOString();
      }
    }
    return params;
  }, [filterCampaign, filterLeadType, filterPriority, filterEmployee, deferredSearchTerm, filterDateRange, customStartDate, customEndDate]);

  // Reset to first page whenever filters change
  const filterSignature = JSON.stringify(serverFilters);
  useEffect(() => {
    setPage(1);
  }, [filterSignature]);

  const cacheKey = `leads:page:${page}:${filterSignature}`;
  const {
    data: pagedLeads,
    loading,
    refreshing: leadsRefreshing,
    refresh: refreshLeads,
  } = useCachedFetch<PagedResponse<Lead>>(
    cacheKey,
    () => leadsApi.listPaged({ ...serverFilters, page, limit: PAGE_SIZE }),
    { ttl: CACHE_TTLS.realtime }
  );
  const leadsList = pagedLeads?.data ?? [];
  const totalLeads = pagedLeads?.total ?? 0;
  const totalPages = pagedLeads?.totalPages ?? 1;

  // Summary cards come from the lightweight /stats endpoint, not the table payload
  const statsKey = `lead-stats:${filterCampaign}`;
  const { data: statsData } = useCachedFetch<LeadStats>(
    statsKey,
    () =>
      leadsApi.getStats(filterCampaign !== "all" ? { campaignId: filterCampaign } : undefined),
    { ttl: CACHE_TTLS.realtime }
  );

  const { data: campaignsData, refresh: refreshCampaigns } = useCachedFetch<Campaign[]>(
    "campaigns:all",
    () => campaignsApi.list(),
    { ttl: CACHE_TTLS.reference }
  );
  const campaigns = campaignsData ?? [];

  // Bulk assign state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    "name", "type", "contact", "campaign", "stage", "budget", "priority", "assignedTo", "created"
  ]));
  const [visibleCustomFields, setVisibleCustomFields] = useState<Set<string>>(new Set());

  const allCustomFields = useMemo(() => {
    const fields = new Set<string>();
    leadsList.forEach(lead => {
      if (lead.customFields) {
        Object.keys(lead.customFields).forEach(key => fields.add(key));
      }
    });
    return Array.from(fields).sort();
  }, [leadsList]);

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  const toggleCustomField = (field: string) => {
    setVisibleCustomFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const canViewTeam =
    user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "TEAM_LEADER";
  const { data: teamData } = useCachedFetch<User[]>(
    canViewTeam ? "users:active" : null,
    () => auth.listUsers().then((users) => users.filter((u) => u.isActive)),
    { ttl: CACHE_TTLS.reference, enabled: canViewTeam }
  );
  const teamMembers = teamData ?? [];

  const fetchLeads = useCallback(async () => {
    try {
      invalidateCache("lead-stats");
      const data = await refreshLeads();
      if (!data) toast.error("Failed to fetch leads");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch leads");
    }
  }, [refreshLeads]);

  const fetchCampaigns = useCallback(async () => {
    await refreshCampaigns();
  }, [refreshCampaigns]);

  useEffect(() => {
    if (campaignIdFromUrl) {
      setFilterCampaign(campaignIdFromUrl);
    }
  }, [campaignIdFromUrl]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Rows are already filtered server-side; the current page renders as-is.
  const filteredLeads = leadsList;

  // Stats come from /leads/stats (role-scoped, non-archived)
  const statsByType = useMemo(() => {
    const acc = {} as Record<LeadType, number>;
    for (const item of statsData?.byType ?? []) {
      acc[item.type as LeadType] = item.count;
    }
    return acc;
  }, [statsData]);

  // Bulk selection helpers
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleLeadSelection = (leadId: string, index: number, isShift: boolean) => {
    if (isShift && lastSelectedIndex !== null) {
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        // Add all leads in this range
        for (let i = start; i <= end; i++) {
          next.add(filteredLeads[i].id);
        }
        return next;
      });
    } else {
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        if (next.has(leadId)) {
          next.delete(leadId);
        } else {
          next.add(leadId);
        }
        return next;
      });
    }
    setLastSelectedIndex(index);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
    setLastSelectedIndex(null);
  };

  const isAllSelected = filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length;
  const isSomeSelected = selectedLeadIds.size > 0 && selectedLeadIds.size < filteredLeads.length;

  const handleOpenBulkAssign = async () => {
    if (teamMembers.length === 0) {
      try {
        await auth.listUsers();
      } catch (error) {
        toast.error("Failed to load team members");
        return;
      }
    }
    setShowBulkAssignDialog(true);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignUserId) {
      toast.error("Please select a team member");
      return;
    }

    setBulkAssigning(true);
    try {
      const result = await leadsApi.bulkAssign(Array.from(selectedLeadIds), bulkAssignUserId);
      toast.success(result.message);
      setSelectedLeadIds(new Set());
      setShowBulkAssignDialog(false);
      setBulkAssignUserId("");
      invalidateCache("leads:");
      invalidateCache("lead-stats");
      fetchLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign leads");
    } finally {
      setBulkAssigning(false);
    }
  };

  const canBulkAssign = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "TEAM_LEADER";
  const canDelete = user?.role === "ADMIN";

  // Hard-delete state (ADMIN only, permanent)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSingle = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const result = await leadsApi.delete(deleteTargetId);
      invalidateCache("leads:");
      invalidateCache("lead-stats");
      toast.success(result.message || "Lead deleted permanently");
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
      setDeleteTargetId(null);
      fetchLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    setDeleting(true);
    try {
      const result = await leadsApi.bulkDelete(Array.from(selectedLeadIds));
      invalidateCache("leads:");
      invalidateCache("lead-stats");
      toast.success(result.message || "Leads deleted permanently");
      setSelectedLeadIds(new Set());
      setShowBulkDeleteDialog(false);
      fetchLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leads");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    if (totalLeads === 0) {
      toast.error("No leads to export");
      return;
    }

    // Fetch all matching leads across pages (100/page to stay light on 0.5 CPU)
    let exportLeads: Lead[] = [];
    try {
      let p = 1;
      while (exportLeads.length < totalLeads) {
        const res = await leadsApi.listPaged({ ...serverFilters, page: p, limit: 100 });
        exportLeads.push(...res.data);
        if (res.data.length === 0 || exportLeads.length >= res.total) break;
        p += 1;
      }
    } catch {
      toast.error("Failed to fetch leads for export");
      return;
    }

    const baseHeaders = [
      "Name",
      "Email",
      "Mobile",
      "Type",
      "Campaign",
      "Stage",
      "Priority",
      "Budget Min",
      "Budget Max",
      "Assigned To",
      "Remark",
      "Created At"
    ];

    const activeCustomFields = Array.from(visibleCustomFields);
    const headers = [...baseHeaders, ...activeCustomFields];

    const rows = exportLeads.map(lead => {
      // Normalize name to convert styled math/unicode characters to standard ascii
      const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim().normalize("NFKC");

      // Latest dispose remark from mobile (CALL interaction content).
      // Mirrors apps/mobile dispose logic: strip attachment markdown and
      // placeholder defaults so the CSV shows only the human remark.
      const rawRemark = lead.interactions?.[0]?.content || "";
      const cleanRemark = rawRemark
        .replace(/\n\n\[Attachment: .*?\]\(.*?\)/g, "")
        .replace(/\n\n\[Attachment: .*?\] \(Document ID: .*?\)/g, "")
        .trim();
      const remark =
        cleanRemark === "" ||
        cleanRemark === "Call connected successfully." ||
        cleanRemark === "Call was not connected."
          ? ""
          : cleanRemark.normalize("NFKC").replace(/[\r\n]+/g, " ").trim();

      const rowData = [
        fullName,
        lead.email || "",
        lead.mobile || "",
        lead.leadType,
        lead.campaign?.name || "",
        lead.currentStage?.name || "",
        lead.priority,
        lead.budgetMin || "",
        lead.budgetMax || "",
        lead.assignedTo?.fullName || "",
        remark,
        new Date(lead.createdAt).toLocaleDateString()
      ];

      // Add custom field values
      activeCustomFields.forEach(field => {
        if (lead.customFields && typeof lead.customFields === 'object') {
          const val = (lead.customFields as Record<string, any>)[field];
          rowData.push(val !== undefined && val !== null ? String(val).normalize("NFKC") : "");
        } else {
          rowData.push("");
        }
      });

      return rowData;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900">Leads</h1>
            {campaignIdFromUrl && campaigns.length > 0 && (
              <Badge variant="outline" className="text-sm">
                Campaign: {campaigns.find(c => c.id === campaignIdFromUrl)?.name}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {campaignIdFromUrl ? "Leads filtered by campaign" : "Manage and track your real estate leads"}
          </p>
          {campaignIdFromUrl && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm mt-1"
              onClick={() => {
                setFilterCampaign("all");
                router.push("/dashboard/leads");
              }}
            >
              ← View all leads
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </Button>
          <ImportLeadsDialog onLeadsImported={fetchLeads}>
            <Button variant="outline">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import Leads
            </Button>
          </ImportLeadsDialog>
          <AddLeadDialog onLeadAdded={fetchLeads}>
            <Button>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Lead
            </Button>
          </AddLeadDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">{statsData?.total ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Buyers</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {statsByType.BUYER || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Sellers</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {statsByType.SELLER || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Investors</CardTitle>
            <div className="h-2 w-2 rounded-full bg-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {statsByType.INVESTOR || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Renters</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {statsByType.RENTER || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLeadType} onValueChange={setFilterLeadType}>
              <SelectTrigger>
                <SelectValue placeholder="All Lead Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lead Types</SelectItem>
                <SelectItem value="BUYER">Buyer</SelectItem>
                <SelectItem value="SELLER">Seller</SelectItem>
                <SelectItem value="INVESTOR">Investor</SelectItem>
                <SelectItem value="RENTER">Renter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {(user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "TEAM_LEADER") && (
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger>
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
            )}
          </div>
          
          {filterDateRange === "custom" && (
            <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <Label htmlFor="start-date" className="text-sm font-medium text-neutral-600">Start Date</Label>
                <Input 
                  id="start-date"
                  type="date" 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)} 
                  className="w-[160px] bg-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="end-date" className="text-sm font-medium text-neutral-600">End Date</Label>
                <Input 
                  id="end-date"
                  type="date" 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)} 
                  className="w-[160px] bg-white"
                />
              </div>
              {(customStartDate || customEndDate) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
                  className="text-neutral-500"
                >
                  Clear Range
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      {(selectedLeadIds.size > 0 && (canBulkAssign || canDelete)) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-blue-200 bg-white shadow-xl px-4 py-2 animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {selectedLeadIds.size}
            </div>
            <span className="text-sm font-medium text-neutral-700 whitespace-nowrap">
              selected
            </span>
          </div>
          <div className="h-6 w-px bg-neutral-200 mx-1" />
          <Button
            size="sm"
            variant="ghost"
            className="text-neutral-500 hover:text-neutral-900 rounded-full"
            onClick={() => setSelectedLeadIds(new Set())}
          >
            Clear
          </Button>
          {canBulkAssign && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 shadow-sm"
            onClick={handleOpenBulkAssign}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Assign Selected
          </Button>
          )}
          {canDelete && (
          <Button
            size="sm"
            variant="destructive"
            className="rounded-full px-5 shadow-sm"
            onClick={() => setShowBulkDeleteDialog(true)}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete Selected
          </Button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6">
          <StatCardsSkeleton count={5} />
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : filteredLeads.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-neutral-900">
                {searchTerm || filterCampaign !== "all" || filterLeadType !== "all" || filterPriority !== "all"
                  ? "No leads match your filters"
                  : "No leads yet"}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {searchTerm || filterCampaign !== "all" || filterLeadType !== "all" || filterPriority !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first lead"}
              </p>
              {!searchTerm && filterCampaign === "all" && filterLeadType === "all" && filterPriority === "all" && (
                <div className="mt-4">
                  <AddLeadDialog onLeadAdded={fetchLeads}>
                    <Button>Add Lead</Button>
                  </AddLeadDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Table View */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium">
              All Leads ({totalLeads})
              {leadsRefreshing && (
                <span className="ml-2 text-xs font-normal text-neutral-400">Updating…</span>
              )}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Standard Columns</h4>
                    <div className="space-y-2">
                      {[
                        { key: "name", label: "Name" },
                        { key: "type", label: "Type" },
                        { key: "contact", label: "Contact" },
                        { key: "campaign", label: "Campaign" },
                        { key: "stage", label: "Stage" },
                        { key: "budget", label: "Budget" },
                        { key: "priority", label: "Priority" },
                        { key: "assignedTo", label: "Assigned To" },
                        { key: "created", label: "Created" },
                      ].map(col => (
                        <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={visibleColumns.has(col.key)}
                            onCheckedChange={() => toggleColumn(col.key)}
                          />
                          <span className="text-sm">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {allCustomFields.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Custom Fields</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {allCustomFields.map(field => (
                          <label key={field} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={visibleCustomFields.has(field)}
                              onCheckedChange={() => toggleCustomField(field)}
                            />
                            <span className="text-sm">{field}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canBulkAssign && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected;
                          }}
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    {visibleColumns.has("name") && <TableHead>Name</TableHead>}
                    {visibleColumns.has("type") && <TableHead>Type</TableHead>}
                    {visibleColumns.has("contact") && <TableHead>Contact</TableHead>}
                    {visibleColumns.has("campaign") && <TableHead>Campaign</TableHead>}
                    {visibleColumns.has("stage") && <TableHead>Stage</TableHead>}
                    {visibleColumns.has("budget") && <TableHead>Budget</TableHead>}
                    {visibleColumns.has("priority") && <TableHead>Priority</TableHead>}
                    {visibleColumns.has("assignedTo") && <TableHead>Assigned To</TableHead>}
                    {visibleColumns.has("created") && <TableHead>Created</TableHead>}
                    {visibleCustomFields.size > 0 && allCustomFields.filter(f => visibleCustomFields.has(f)).map(field => (
                      <TableHead key={field}>{field}</TableHead>
                    ))}
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead, index) => (
                    <TableRow
                      key={lead.id}
                      className={selectedLeadIds.has(lead.id) ? "bg-blue-50/50" : ""}
                    >
                      {canBulkAssign && (
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={(e) => toggleLeadSelection(lead.id, index, (e.nativeEvent as any).shiftKey)}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.has("name") && (
                        <TableCell className="font-medium">
                          <div>
                            <div>{lead.firstName} {lead.lastName}</div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has("type") && (
                        <TableCell>
                          <Badge className={`${LEAD_TYPE_STYLES[lead.leadType]} border`}>
                            {lead.leadType}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.has("contact") && (
                        <TableCell className="text-neutral-600">
                          <div className="text-sm">
                            {lead.email && <div>{lead.email}</div>}
                            {lead.mobile && <div className="text-neutral-500">{lead.mobile}</div>}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has("campaign") && (
                        <TableCell className="text-neutral-600">
                          {lead.campaign?.name || "—"}
                        </TableCell>
                      )}
                      {visibleColumns.has("stage") && (
                        <TableCell>
                          <Badge
                            className="border"
                            style={{
                              backgroundColor: lead.currentStage?.color ? `${lead.currentStage.color}20` : undefined,
                              color: lead.currentStage?.color || undefined,
                              borderColor: lead.currentStage?.color ? `${lead.currentStage.color}40` : undefined,
                            }}
                          >
                            {lead.currentStage?.name || "—"}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.has("budget") && (
                        <TableCell className="text-neutral-600">
                          {lead.budgetMin || lead.budgetMax ? (
                            <div className="text-sm">
                              {lead.budgetMin && lead.budgetMax
                                ? `${formatCurrency(lead.budgetMin)} - ${formatCurrency(lead.budgetMax)}`
                                : lead.budgetMin
                                ? `${formatCurrency(lead.budgetMin)}+`
                                : `Up to ${formatCurrency(lead.budgetMax)}`}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("priority") && (
                        <TableCell>
                          <Badge className={`${PRIORITY_STYLES[lead.priority]} border-0`}>
                            {lead.priority}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.has("assignedTo") && (
                        <TableCell className="text-neutral-600">
                          {lead.assignedTo ? (
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {lead.assignedTo.fullName}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("created") && (
                        <TableCell className="text-neutral-500 text-sm">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                      )}
                      {visibleCustomFields.size > 0 && allCustomFields.filter(f => visibleCustomFields.has(f)).map(field => (
                        <TableCell key={field} className="text-sm text-neutral-600">
                          {lead.customFields?.[field] ? String(lead.customFields[field]).substring(0, 30) : "—"}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                        <EditLeadDialog leadId={lead.id} onLeadUpdated={fetchLeads}>
                          <Button variant="ghost" size="sm">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </Button>
                        </EditLeadDialog>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete lead permanently"
                            onClick={() => setDeleteTargetId(lead.id)}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </Button>
                        )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <p className="text-sm text-neutral-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalLeads)} of{" "}
            {totalLeads} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </Button>
            <span className="text-sm font-medium text-neutral-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign Leads</DialogTitle>
            <DialogDescription>
              Assign {selectedLeadIds.size} selected lead{selectedLeadIds.size > 1 ? "s" : ""} to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select onValueChange={setBulkAssignUserId} value={bulkAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName} ({member.role.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkAssignDialog(false);
                setBulkAssignUserId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssigning || !bulkAssignUserId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bulkAssigning ? "Assigning..." : `Assign ${selectedLeadIds.size} Lead${selectedLeadIds.size > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirm */}
      <Dialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete lead permanently?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The lead and its interactions, tasks, notes and documents will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSingle} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} permanently?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All selected leads and their related data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? "Deleting..." : `Delete ${selectedLeadIds.size} permanently`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
