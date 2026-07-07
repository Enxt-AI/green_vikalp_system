"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { campaigns as campaignsApi, Lead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ArrowLeft, Building2, MapPin, Star, Trash2, Plus, LayoutGrid, Columns3 } from "lucide-react";
import { AddPropertiesDialog } from "@/components/add-campaign-properties-dialog";
import { KanbanBoard } from "@/components/kanban-board";
import { CampaignAnalyticsChart } from "@/components/campaign-analytics-chart";

const STATUS_STYLES = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-neutral-100 text-neutral-700",
  DRAFT: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

type ViewMode = "overview" | "kanban" | "archived";

/**
 * CampaignDetailPage Component
 * 
 * Main campaign management interface with three view modes:
 * 
 * 1. OVERVIEW MODE (Default):
 *    - Two interactive pie charts (Pipeline Distribution & Deal Outcomes)
 *    - Quick stats summary (Total, Active, Conversion Rate)
 *    - Click on chart slice to view leads in that stage
 *    - Filtered lead table when stage selected
 * 
 * 2. KANBAN MODE:
 *    - Drag-and-drop pipeline board
 *    - Visual stage columns with lead cards
 *    - Move leads between stages by dragging
 *    - Quick actions for archiving and stage changes
 *    - Only shows non-archived leads
 * 
 * 3. ARCHIVED MODE:
 *    - Table view of all archived leads
 *    - Shows stage, archive reason, archive date
 *    - "Convert to Lead" button to restore archived leads
 *    - User selects which stage to restore lead to
 * 
 * Critical Business Logic:
 * - Loads ALL leads (archived + non-archived) for accurate metrics
 * - Final stage leads (Closed Won/Lost) count in metrics even when archived
 * - Active stage leads do NOT count when archived
 * - Moving to Closed Won/Lost is the ONLY way to mark deal outcomes
 * - Archiving is separate from deal outcomes
 * 
 * State Management:
 * - campaign: Full campaign object with pipeline and stages
 * - leads: ALL leads (both archived and active)
 * - viewMode: Current view (overview/kanban/archived)
 * - selectedStageId: Active filter for stage-specific lead view
 * 
 * Access Control:
 * - Users can only access campaigns they're assigned to (unless Admin/Manager)
 */
export default function CampaignDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingProperty, setRemovingProperty] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [convertingLead, setConvertingLead] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
      loadLeads();
    }
  }, [campaignId]);

  async function loadCampaign() {
    try {
      setLoading(true);
      const data = await campaignsApi.get(campaignId);
      setCampaign(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  async function loadLeads() {
    try {
      const data = await campaignsApi.getLeads(campaignId);
      // Include ALL leads (archived and non-archived) for metrics calculation
      setLeads(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load leads");
    }
  }

  async function handleMoveLeadToStage(leadId: string, stageId: string) {
    try {
      const targetStage = campaign.pipeline?.stages.find((s: any) => s.id === stageId);
      
      // Check if moving to a final stage (Closed Won/Lost)
      if (targetStage?.isFinal) {
        const stageName = targetStage.name;
        const isWon = stageName.toLowerCase().includes('won');
        const confirmation = confirm(
          `Move this lead to ${stageName}?\n\n${
            isWon 
              ? 'This will mark the deal as WON and count toward your win rate.' 
              : 'This will mark the deal as LOST and count toward your metrics.'
          }\n\nYou can archive it later if needed.`
        );
        
        if (!confirmation) return;
      }
      
      await campaignsApi.moveLeadToStage(campaignId, leadId, stageId);
      toast.success(targetStage?.isFinal ? "Deal closed successfully!" : "Lead moved successfully");
      await loadLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to move lead");
    }
  }

  async function handleArchiveLead(leadId: string, reason?: string) {
    try {
      const lead = leads.find(l => l.id === leadId);
      const stage = campaign.pipeline?.stages.find((s: any) => s.id === lead?.currentStageId);
      
      if (stage?.isFinal) {
        const confirmation = confirm(
          `Archive this ${stage.name} deal?\n\nNote: This lead will still count in your metrics (${stage.name.toLowerCase().includes('won') ? 'Won' : 'Lost'} deals), but will be hidden from the active pipeline view.`
        );
        if (!confirmation) return;
      }
      
      await campaignsApi.archiveLead(campaignId, leadId, reason);
      toast.success("Lead archived (still counted in metrics)");
      await loadLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive lead");
    }
  }

  /**
   * handleConvertToLead - Restore an archived lead back to active status
   * 
   * User Flow:
   * 1. User clicks "Convert to Lead" on an archived lead
   * 2. System shows prompt with numbered list of active pipeline stages
   * 3. User enters stage number to select destination
   * 4. System validates selection
   * 5. Lead is unarchived and moved to selected stage
   * 6. Creates interaction logs for audit trail
   * 7. Refreshes data and returns to overview mode
   * 
   * Validation:
   * - Only shows active stages (not Closed Won/Lost)
   * - Validates user input is a valid number
   * - Ensures selected stage exists
   * 
   * Use Cases:
   * - Reactivate accidentally archived leads
   * - Bring back old opportunities when customer returns
   * - Restore archived deals for renegotiation
   * 
   * @param leadId - UUID of the archived lead to convert
   */
  async function handleConvertToLead(leadId: string) {
    if (!campaign.pipeline?.stages) return;

    const activeStages = campaign.pipeline.stages.filter((s: any) => !s.isFinal);
    
    if (activeStages.length === 0) {
      toast.error("No active stages available in pipeline");
      return;
    }

    // Create a simple select dialog using prompt
    const stageOptions = activeStages.map((s: any, i: number) => `${i + 1}. ${s.name}`).join('\n');
    const selection = prompt(
      `Select a stage to move this lead to:\n\n${stageOptions}\n\nEnter the number:`
    );

    if (!selection) return;

    const stageIndex = parseInt(selection) - 1;
    if (isNaN(stageIndex) || stageIndex < 0 || stageIndex >= activeStages.length) {
      toast.error("Invalid selection");
      return;
    }

    const selectedStage = activeStages[stageIndex];

    try {
      setConvertingLead(leadId);
      await campaignsApi.convertToLead(campaignId, leadId, selectedStage.id);
      toast.success(`Lead converted and moved to ${selectedStage.name}`);
      await loadLeads();
      setViewMode("overview"); // Switch back to overview
    } catch (error: any) {
      toast.error(error.message || "Failed to convert lead");
    } finally {
      setConvertingLead(null);
    }
  }

  async function handleRemoveProperty(propertyId: string) {
    if (!confirm("Remove this property from the campaign?")) return;

    try {
      setRemovingProperty(propertyId);
      await campaignsApi.removeProperty(campaignId, propertyId);
      toast.success("Property removed from campaign");
      loadCampaign();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove property");
    } finally {
      setRemovingProperty(null);
    }
  }

  async function handleToggleFeatured(propertyId: string, currentFeatured: boolean) {
    try {
      await campaignsApi.updateProperty(campaignId, propertyId, {
        isFeatured: !currentFeatured,
      });
      toast.success(currentFeatured ? "Removed from featured" : "Added to featured");
      loadCampaign();
    } catch (error: any) {
      toast.error(error.message || "Failed to update property");
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-neutral-600">Campaign not found</p>
        <Button onClick={() => router.push("/dashboard/campaigns")}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const canManage = user && (user.role === "ADMIN" || user.role === "MANAGER");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/campaigns")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold text-neutral-900">{campaign.name}</h1>
            <Badge className={STATUS_STYLES[campaign.status as keyof typeof STATUS_STYLES]}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-neutral-600 ml-11">{campaign.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("overview")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <Columns3 className="h-4 w-4 mr-2" />
            Pipeline
          </Button>
          <Button
            variant={viewMode === "archived" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("archived")}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Archived ({leads.filter(l => l.isArchived).length})
          </Button>
        </div>
      </div>

      {viewMode === "archived" ? (
        /* Archived Leads View */
        <Card>
          <CardHeader>
            <CardTitle>Archived Leads</CardTitle>
            <p className="text-sm text-muted-foreground">
              Leads archived from Closed Won/Lost still count in metrics. Convert them back to active leads if needed.
            </p>
          </CardHeader>
          <CardContent>
            {leads.filter(l => l.isArchived).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No archived leads
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Archived Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.filter(l => l.isArchived).map((lead) => {
                    const stage = campaign.pipeline?.stages.find((s: any) => s.id === lead.currentStageId);
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>{lead.email || "-"}</TableCell>
                        <TableCell>{lead.mobile || "-"}</TableCell>
                        <TableCell>
                          <Badge 
                            style={{ 
                              backgroundColor: stage?.color || "#gray",
                              color: "white"
                            }}
                          >
                            {stage?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.archivedReason || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToLead(lead.id)}
                            disabled={convertingLead === lead.id}
                          >
                            {convertingLead === lead.id ? "Converting..." : "Convert to Lead"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag leads to Closed Won/Lost to mark deal outcomes. Archive deals separately if needed.
              </p>
            </CardHeader>
            <CardContent>
              {campaign.pipeline?.stages && (
                <KanbanBoard
                  stages={campaign.pipeline.stages}
                  leads={leads.filter(lead => !lead.isArchived)}
                  onMoveLeadToStage={handleMoveLeadToStage}
                  onArchiveLead={handleArchiveLead}
                  onLeadClick={(lead) => router.push(`/dashboard/leads?id=${lead.id}`)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Overview Mode */
        <>
          {/* Analytics Charts */}
          {campaign.pipeline?.stages && (
            <CampaignAnalyticsChart
              stages={campaign.pipeline.stages}
              leads={leads}
              onStageClick={(stageId) => setSelectedStageId(stageId)}
            />
          )}

          {/* Quick Stats Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-neutral-900">
                  {campaign.pipeline?.name}
                </div>
                <div className="text-sm text-neutral-500">{campaign.pipeline?.type}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">
                  {leads.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {leads.filter(l => l.isArchived).length} archived
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Active Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">
                  {leads.filter(l => {
                    const stage = campaign.pipeline?.stages.find((s: any) => s.id === l.currentStageId);
                    return !stage?.isFinal && !l.isArchived;
                  }).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">working leads</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">
                  {(() => {
                    const won = leads.filter(l => {
                      const stage = campaign.pipeline?.stages.find((s: any) => s.id === l.currentStageId);
                      return stage?.isFinal && stage?.name.toLowerCase().includes('won');
                    }).length;
                    const total = leads.length;
                    return total > 0 ? `${Math.round((won / total) * 100)}%` : '0%';
                  })()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">overall conversion</div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Stages Overview */}
          {selectedStageId && campaign.pipeline?.stages && campaign.pipeline.stages.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pipeline Stages</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Click on a stage to view leads (includes archived deals in Closed Won/Lost)
                    </p>
                  </div>
                  {selectedStageId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStageId(null)}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {campaign.pipeline.stages.map((stage: any) => {
                    // For final stages, show all leads (including archived) to show true metrics
                    // For active stages, only show non-archived leads
                    const stageLeads = leads.filter(lead => 
                      lead.currentStageId === stage.id && 
                      (stage.isFinal || !lead.isArchived)
                    );
                    const isSelected = selectedStageId === stage.id;
                    const isClosedWon = stage.isFinal && stage.name.toLowerCase().includes('won');
                    const isClosedLost = stage.isFinal && stage.name.toLowerCase().includes('lost');
                    
                    return (
                      <button
                        key={stage.id}
                        className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-primary shadow-md' : ''
                        } ${
                          isClosedWon ? 'bg-green-50 border-green-300' : 
                          isClosedLost ? 'bg-red-50 border-red-300' : 
                          ''
                        }`}
                        style={{ 
                          borderLeft: `4px solid ${
                            isClosedWon ? '#16a34a' : 
                            isClosedLost ? '#dc2626' : 
                            stage.color
                          }` 
                        }}
                        onClick={() => setSelectedStageId(isSelected ? null : stage.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-semibold text-sm ${
                            isClosedWon ? 'text-green-700' : 
                            isClosedLost ? 'text-red-700' : 
                            ''
                          }`}>
                            {stage.name}
                          </h4>
                          {stage.isFinal && (
                            <Badge 
                              variant={isClosedWon ? "default" : isClosedLost ? "destructive" : "outline"} 
                              className="text-xs"
                            >
                              {isClosedWon ? '✓ Won' : isClosedLost ? '✗ Lost' : 'Final'}
                            </Badge>
                          )}
                        </div>
                        <div className={`text-2xl font-bold ${
                          isClosedWon ? 'text-green-700' : 
                          isClosedLost ? 'text-red-700' : 
                          ''
                        }`}>
                          {stageLeads.length}
                        </div>
                        {stage.description && (
                          <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtered Leads Table */}
          {selectedStageId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {campaign.pipeline?.stages.find((s: any) => s.id === selectedStageId)?.name} Leads
                  </CardTitle>
                  {(() => {
                    const stage = campaign.pipeline?.stages.find((s: any) => s.id === selectedStageId);
                    const filteredLeads = leads.filter(l => 
                      l.currentStageId === selectedStageId && 
                      (stage?.isFinal || !l.isArchived)
                    );
                    const archivedCount = filteredLeads.filter(l => l.isArchived).length;
                    return archivedCount > 0 ? (
                      <Badge variant="secondary">{archivedCount} archived</Badge>
                    ) : null;
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const stage = campaign.pipeline?.stages.find((s: any) => s.id === selectedStageId);
                  const filteredLeads = leads.filter(l => 
                    l.currentStageId === selectedStageId && 
                    (stage?.isFinal || !l.isArchived)
                  );
                  
                  return filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads in this stage
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Follow Up</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                          <TableRow
                            key={lead.id}
                            className={`cursor-pointer hover:bg-accent ${
                              lead.isArchived ? 'opacity-60' : ''
                            }`}
                            onClick={() => router.push(`/dashboard/leads?id=${lead.id}`)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {lead.firstName} {lead.lastName}
                                {lead.isArchived && (
                                  <Badge variant="outline" className="text-xs">Archived</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {lead.email && <div>{lead.email}</div>}
                                {lead.mobile && <div className="text-muted-foreground">{lead.mobile}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {lead.budgetMin && lead.budgetMax ? (
                                <div className="text-sm">
                                  ${lead.budgetMin.toLocaleString()} - ${lead.budgetMax.toLocaleString()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lead.priority === "HIGH"
                                    ? "destructive"
                                    : lead.priority === "MEDIUM"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {lead.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lead.assignedTo?.fullName || "Unassigned"}
                            </TableCell>
                            <TableCell>
                              {lead.nextFollowUpAt ? (
                                new Date(lead.nextFollowUpAt).toLocaleDateString()
                              ) : (
                                <span className="text-muted-foreground">Not set</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                );
                })()}
              </CardContent>
            </Card>
          )}

      {/* Campaign Properties */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Properties</CardTitle>
              <p className="text-sm text-neutral-600 mt-1">
                Properties featured in this campaign
              </p>
            </div>
            {canManage && (
              <AddPropertiesDialog
                campaignId={campaignId}
                existingPropertyIds={campaign.campaignProperties?.map((cp: any) => cp.property.id) || []}
                onPropertiesAdded={loadCampaign}
              >
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Properties
                </Button>
              </AddPropertiesDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!campaign.campaignProperties || campaign.campaignProperties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">No properties added to this campaign yet</p>
              {canManage && (
                <AddPropertiesDialog
                  campaignId={campaignId}
                  existingPropertyIds={[]}
                  onPropertiesAdded={loadCampaign}
                >
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Property
                  </Button>
                </AddPropertiesDialog>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Beds/Baths</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.campaignProperties.map((cp: any) => (
                  <TableRow key={cp.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{cp.property.address}</div>
                        <div className="flex items-center text-sm text-neutral-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          {cp.property.city}, {cp.property.state} {cp.property.zipCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cp.property.propertyType}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(cp.property.price))}</TableCell>
                    <TableCell>
                      {cp.property.bedrooms} bd / {cp.property.bathrooms} ba
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          cp.property.listingStatus === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-neutral-100 text-neutral-700"
                        }
                      >
                        {cp.property.listingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cp.isFeatured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleToggleFeatured(cp.property.id, cp.isFeatured)
                            }
                          >
                            <Star
                              className={`h-4 w-4 ${
                                cp.isFeatured ? "fill-yellow-500 text-yellow-500" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveProperty(cp.property.id)}
                            disabled={removingProperty === cp.property.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

          {/* Assigned Team */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campaign.assignedTo?.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{member.fullName}</div>
                      <div className="text-sm text-neutral-600">{member.email}</div>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
