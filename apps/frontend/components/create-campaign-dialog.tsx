"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { campaigns, pipelines, auth, type CampaignSource, type CampaignStatus, type Pipeline, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type CreateCampaignDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCampaignCreated?: () => void;
};

const CAMPAIGN_SOURCES: { value: CampaignSource; label: string }[] = [
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "LINKEDIN_ADS", label: "LinkedIn Ads" },
  { value: "REFERRAL", label: "Referral" },
  { value: "WEBSITE", label: "Website" },
  { value: "WALK_IN", label: "Walk-In" },
  { value: "PHONE_INQUIRY", label: "Phone Inquiry" },
  { value: "EMAIL", label: "Email" },
  { value: "OTHER", label: "Other" },
];

const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
];

export function CreateCampaignDialog({
  children,
  open,
  onOpenChange,
  onCampaignCreated,
}: CreateCampaignDialogProps) {
  // Controlled/uncontrolled state pattern
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange || (() => { })) : setInternalOpen;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("ACTIVE");
  const [source, setSource] = useState<CampaignSource>("WEBSITE");
  const [sourceDetails, setSourceDetails] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [pipelinesList, setPipelinesList] = useState<Pipeline[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load pipelines and users when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      loadData();
    }
  }, [dialogOpen]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setName("");
      setDescription("");
      setPipelineId("");
      setStatus("ACTIVE");
      setSource("WEBSITE");
      setSourceDetails("");
      setStartDate("");
      setEndDate("");
      setBudget("");
      setSelectedUserIds([]);
    }
  }, [dialogOpen]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pipelinesData, usersData] = await Promise.all([
        pipelines.list(),
        auth.listUsers(),
      ]);

      // Filter only active pipelines
      const activePipelines = pipelinesData.filter((p) => p.isActive);
      setPipelinesList(activePipelines);

      // Filter only active users
      const activeUsers = usersData.filter((u) => u.isActive);
      setUsersList(activeUsers);

      // Auto-select first pipeline if available
      if (activePipelines.length > 0 && !pipelineId) {
        setPipelineId(activePipelines[0].id);
      }

      // Set default start date to today
      if (!startDate) {
        const today = new Date().toISOString().split("T")[0];
        setStartDate(today);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load pipelines and users");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (!pipelineId) {
      toast.error("Please select a pipeline");
      return;
    }

    if (!startDate) {
      toast.error("Start date is required");
      return;
    }

    // Validate end date is after start date
    if (endDate && endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    // Validate budget is positive
    if (budget && parseFloat(budget) < 0) {
      toast.error("Budget must be a positive number");
      return;
    }

    try {
      setIsCreating(true);

      await campaigns.create({
        name: name.trim(),
        description: description.trim() || undefined,
        pipelineId,
        status,
        source,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        budget: budget ? parseFloat(budget) : undefined,
        assignedToIds: selectedUserIds,
      });

      toast.success("Campaign created successfully");
      setDialogOpen(false);
      onCampaignCreated?.();
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedPipeline = pipelinesList.find((p) => p.id === pipelineId);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q1 2026 Lead Generation"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of this campaign..."
                  maxLength={1000}
                  rows={3}
                />
              </div>
            </div>

            {/* Pipeline & Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pipeline">Pipeline *</Label>
                <Select value={pipelineId} onValueChange={setPipelineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelinesList.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        <div className="flex items-center gap-2">
                          <span>{pipeline.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {pipeline.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPipeline && (
                  <p className="text-xs text-neutral-500">
                    {selectedPipeline.stages.length} stages
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as CampaignStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Select value={source} onValueChange={(value) => setSource(value as CampaignSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceDetails">Source Details</Label>
                <Input
                  id="sourceDetails"
                  value={sourceDetails}
                  onChange={(e) => setSourceDetails(e.target.value)}
                  placeholder="e.g., Campaign ID, URL"
                  maxLength={500}
                />
              </div>
            </div>

            {/* Dates & Budget */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Assigned Users */}
            <div className="space-y-3 border-t pt-4">
              <Label>Assigned Users (Optional)</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {usersList.length === 0 ? (
                  <p className="text-sm text-neutral-500">No active users available</p>
                ) : (
                  usersList.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="flex flex-1 cursor-pointer items-center gap-2"
                      >
                        <span className="text-sm font-medium">{user.fullName}</span>
                        <Badge
                          variant={
                            user.role === "ADMIN"
                              ? "default"
                              : user.role === "MANAGER"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {user.role}
                        </Badge>
                      </label>
                    </div>
                  ))
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-neutral-500">
                  {selectedUserIds.length} user{selectedUserIds.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
