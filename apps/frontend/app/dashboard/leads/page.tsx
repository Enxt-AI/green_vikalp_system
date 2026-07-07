"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { ImportLeadsDialog } from "@/components/import-leads-dialog";
import { EditLeadDialog } from "@/components/edit-lead-dialog";
import { leads as leadsApi, campaigns as campaignsApi, auth, type Lead, type Campaign, type LeadType, type Priority, type User } from "@/lib/api";
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
  
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCampaign, setFilterCampaign] = useState<string>(campaignIdFromUrl || "all");
  const [filterLeadType, setFilterLeadType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Bulk assign state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leadsApi.list();
      setLeadsList(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await campaignsApi.list();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
  }, [fetchLeads, fetchCampaigns]);

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

  // Filter leads
  const filteredLeads = leadsList.filter((lead) => {
    const matchesSearch =
      searchTerm === "" ||
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.mobile?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCampaign =
      filterCampaign === "all" || lead.campaignId === filterCampaign;

    const matchesLeadType =
      filterLeadType === "all" || lead.leadType === filterLeadType;

    const matchesPriority =
      filterPriority === "all" || lead.priority === filterPriority;

    return matchesSearch && matchesCampaign && matchesLeadType && matchesPriority;
  });

  // Calculate stats
  const statsByType = leadsList.reduce((acc, lead) => {
    acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
    return acc;
  }, {} as Record<LeadType, number>);

  // Bulk selection helpers
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const isAllSelected = filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length;
  const isSomeSelected = selectedLeadIds.size > 0 && selectedLeadIds.size < filteredLeads.length;

  const handleOpenBulkAssign = async () => {
    try {
      const users = await auth.listUsers();
      setTeamMembers(users.filter((u) => u.isActive));
    } catch (error) {
      toast.error("Failed to load team members");
      return;
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
      fetchLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign leads");
    } finally {
      setBulkAssigning(false);
    }
  };

  const canBulkAssign = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "TEAM_LEADER";

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
            <div className="text-2xl font-bold text-neutral-900">{leadsList.length}</div>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedLeadIds.size > 0 && canBulkAssign && (
        <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-blue-800">
            {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => setSelectedLeadIds(new Set())}
          >
            Clear Selection
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleOpenBulkAssign}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Assign to Team Member
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
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
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              All Leads ({filteredLeads.length})
            </CardTitle>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
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
                            onChange={() => toggleLeadSelection(lead.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div>
                          <div>{lead.firstName} {lead.lastName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${LEAD_TYPE_STYLES[lead.leadType]} border`}>
                          {lead.leadType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        <div className="text-sm">
                          {lead.email && <div>{lead.email}</div>}
                          {lead.mobile && <div className="text-neutral-500">{lead.mobile}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {lead.campaign?.name || "—"}
                      </TableCell>
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
                      <TableCell>
                        <Badge className={`${PRIORITY_STYLES[lead.priority]} border-0`}>
                          {lead.priority}
                        </Badge>
                      </TableCell>
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
                      <TableCell className="text-neutral-500 text-sm">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
}
