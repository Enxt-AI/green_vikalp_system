"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  leads as leadsApi,
  campaigns as campaignsApi,
  pipelines as pipelinesApi,
  type LeadType,
  type Priority,
  type Campaign,
  type Pipeline,
  type PipelineStage
} from "@/lib/api";
import { toast } from "sonner";

const LEAD_TYPES: { value: LeadType; label: string }[] = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "INVESTOR", label: "Investor" },
  { value: "RENTER", label: "Renter" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

type AddLeadDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLeadAdded: () => void;
  children?: React.ReactNode;
};

export function AddLeadDialog({ open, onOpenChange, onLeadAdded, children }: AddLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange || (() => { })) : setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    leadType: "BUYER" as LeadType,
    budgetMin: "",
    budgetMax: "",
    campaignId: "",
    currentStageId: "",
    priority: "MEDIUM" as Priority,
    initialNotes: "",
  });

  useEffect(() => {
    if (dialogOpen) {
      loadCampaigns();
      loadPipelines();
    }
  }, [dialogOpen]);

  async function loadPipelines() {
    try {
      const data = await pipelinesApi.list();
      setPipelines(data);
    } catch (error: any) {
      console.error("Failed to load pipelines:", error);
    }
  }

  async function loadCampaigns() {
    try {
      setCampaignsLoading(true);
      const data = await campaignsApi.list({ status: "ACTIVE" });
      setCampaigns(data);

      // Auto-select first campaign and its first stage
      if (data.length > 0) {
        // We'll set the stage after pipelines are loaded
        setFormData(prev => ({
          ...prev,
          campaignId: data[0].id,
        }));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load campaigns");
    } finally {
      setCampaignsLoading(false);
    }
  }

  // Auto-select first stage when campaign is selected and pipelines are loaded
  useEffect(() => {
    if (formData.campaignId && pipelines.length > 0 && !formData.currentStageId) {
      const selectedCampaign = campaigns.find(c => c.id === formData.campaignId);
      if (selectedCampaign) {
        const pipeline = pipelines.find(p => p.id === selectedCampaign.pipelineId);
        if (pipeline && pipeline.stages.length > 0) {
          setFormData(prev => ({
            ...prev,
            currentStageId: pipeline.stages[0].id,
          }));
        }
      }
    }
  }, [formData.campaignId, pipelines, campaigns, formData.currentStageId]);

  const selectedCampaign = campaigns.find(c => c.id === formData.campaignId);
  const selectedPipeline = pipelines.find(p => p.id === selectedCampaign?.pipelineId);

  const resetForm = () => {
    const firstCampaign = campaigns[0];
    const firstPipeline = firstCampaign ? pipelines.find(p => p.id === firstCampaign.pipelineId) : null;

    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      leadType: "BUYER",
      budgetMin: "",
      budgetMax: "",
      campaignId: firstCampaign?.id || "",
      currentStageId: firstPipeline?.stages[0]?.id || "",
      priority: "MEDIUM",
      initialNotes: "",
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }

    if (!formData.campaignId || !formData.currentStageId) {
      toast.error("Campaign and stage are required");
      return;
    }

    setLoading(true);
    try {
      await leadsApi.create({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        leadType: formData.leadType,
        budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : undefined,
        campaignId: formData.campaignId,
        currentStageId: formData.currentStageId,
        priority: formData.priority,
        initialNotes: formData.initialNotes.trim() || undefined,
      });

      toast.success("Lead created successfully");
      resetForm();
      setDialogOpen(false);
      onLeadAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to create lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Create a new real estate lead
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadType">Lead Type</Label>
              <Select
                value={formData.leadType}
                onValueChange={(value: LeadType) =>
                  setFormData({ ...formData, leadType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Priority) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Min Budget (₹)</Label>
              <Input
                id="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={(e) =>
                  setFormData({ ...formData, budgetMin: e.target.value })
                }
                placeholder="250000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetMax">Max Budget (₹)</Label>
              <Input
                id="budgetMax"
                type="number"
                value={formData.budgetMax}
                onChange={(e) =>
                  setFormData({ ...formData, budgetMax: e.target.value })
                }
                placeholder="500000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign">
                Campaign <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.campaignId}
                onValueChange={(value) => {
                  const campaign = campaigns.find(c => c.id === value);
                  const pipeline = pipelines.find(p => p.id === campaign?.pipelineId);
                  setFormData({
                    ...formData,
                    campaignId: value,
                    currentStageId: pipeline?.stages[0]?.id || "",
                  });
                }}
                disabled={campaignsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">
                Stage <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.currentStageId}
                onValueChange={(value) =>
                  setFormData({ ...formData, currentStageId: value })
                }
                disabled={!selectedPipeline}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPipeline?.stages.map((stage: PipelineStage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialNotes">Initial Notes</Label>
            <Textarea
              id="initialNotes"
              value={formData.initialNotes}
              onChange={(e) =>
                setFormData({ ...formData, initialNotes: e.target.value })
              }
              placeholder="Add any initial notes about this lead..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
