"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { leads, campaigns as campaignsApi, users as usersApi, type Lead, type Priority, type LeadType, type PropertyType, type MoveInTimeline, type HousingStatus, type PreApprovalStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type EditLeadDialogProps = {
  leadId: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLeadUpdated?: () => void;
};

type Campaign = {
  id: string;
  name: string;
  pipeline: {
    id: string;
    name: string;
    stages: Array<{ id: string; name: string; order: number; color: string }>;
  };
};

type User = {
  id: string;
  fullName: string;
  email: string;
};

const LEAD_TYPES: { value: LeadType; label: string }[] = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "INVESTOR", label: "Investor" },
  { value: "RENTER", label: "Renter" },
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "HOUSE", label: "House" },
  { value: "CONDO", label: "Condo" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "MULTI_FAMILY", label: "Multi-Family" },
  { value: "MANUFACTURED", label: "Manufactured" },
];

export function EditLeadDialog({
  leadId,
  children,
  open,
  onOpenChange,
  onLeadUpdated,
}: EditLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("BUYER");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const [bathroomsMin, setBathroomsMin] = useState("");
  const [squareFeetMin, setSquareFeetMin] = useState("");
  const [locationPreference, setLocationPreference] = useState<string[]>([]);
  const [propertyTypePreference, setPropertyTypePreference] = useState<PropertyType[]>([]);
  const [moveInTimeline, setMoveInTimeline] = useState<MoveInTimeline | "">("");
  const [currentHousingStatus, setCurrentHousingStatus] = useState<HousingStatus | "">("");
  const [preApprovalStatus, setPreApprovalStatus] = useState<PreApprovalStatus | "">("");
  const [preApprovalAmount, setPreApprovalAmount] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [tags, setTags] = useState<string[]>([]);
  const [currentStageId, setCurrentStageId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  // Load lead data when dialog opens
  useEffect(() => {
    if (dialogOpen && leadId) {
      loadLead();
      loadCampaigns();
      loadUsers();
    }
  }, [dialogOpen, leadId]);

  const loadLead = async () => {
    setIsLoading(true);
    try {
      const data = await leads.get(leadId);
      setLead(data);
      
      // Populate form
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setEmail(data.email || "");
      setMobile(data.mobile || "");
      setAlternatePhone(data.alternatePhone || "");
      setLeadType(data.leadType);
      setBudgetMin(data.budgetMin?.toString() || "");
      setBudgetMax(data.budgetMax?.toString() || "");
      setBedroomsMin(data.bedroomsMin?.toString() || "");
      setBathroomsMin(data.bathroomsMin?.toString() || "");
      setSquareFeetMin(data.squareFeetMin?.toString() || "");
      setLocationPreference(data.locationPreference || []);
      setPropertyTypePreference(data.propertyTypePreference || []);
      setMoveInTimeline((data.moveInTimeline as MoveInTimeline) || "");
      setCurrentHousingStatus((data.currentHousingStatus as HousingStatus) || "");
      setPreApprovalStatus((data.preApprovalStatus as PreApprovalStatus) || "");
      setPreApprovalAmount(data.preApprovalAmount?.toString() || "");
      setPriority(data.priority);
      setTags(data.tags || []);
      setCurrentStageId(data.currentStageId);
      setAssignedToId(data.assignedToId);
      setNextFollowUpAt(data.nextFollowUpAt ? new Date(data.nextFollowUpAt).toISOString().split('T')[0] : "");
    } catch (error: any) {
      toast.error("Failed to load lead");
      setDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await campaignsApi.list();
      setCampaigns(data as any);
    } catch (error: any) {
      console.error("Failed to load campaigns");
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersApi.list();
      setUsers((data as any).users || []);
    } catch (error: any) {
      console.error("Failed to load users");
    }
  };

  const togglePropertyType = (type: PropertyType) => {
    setPropertyTypePreference(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addLocation = (location: string) => {
    if (location.trim() && !locationPreference.includes(location.trim())) {
      setLocationPreference([...locationPreference, location.trim()]);
    }
  };

  const removeLocation = (location: string) => {
    setLocationPreference(locationPreference.filter(l => l !== location));
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        leadType,
        budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
        budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
        bedroomsMin: bedroomsMin ? parseInt(bedroomsMin) : undefined,
        bathroomsMin: bathroomsMin ? parseFloat(bathroomsMin) : undefined,
        squareFeetMin: squareFeetMin ? parseInt(squareFeetMin) : undefined,
        locationPreference: locationPreference.length > 0 ? locationPreference : undefined,
        propertyTypePreference: propertyTypePreference.length > 0 ? propertyTypePreference : undefined,
        moveInTimeline: moveInTimeline || undefined,
        currentHousingStatus: currentHousingStatus || undefined,
        preApprovalStatus: preApprovalStatus || undefined,
        preApprovalAmount: preApprovalAmount ? parseFloat(preApprovalAmount) : undefined,
        priority,
        tags: tags.length > 0 ? tags : undefined,
        currentStageId: currentStageId !== lead?.currentStageId ? currentStageId : undefined,
        assignedToId: assignedToId !== lead?.assignedToId ? assignedToId : undefined,
        nextFollowUpAt: nextFollowUpAt || undefined,
      };

      await leads.update(leadId, updateData);
      
      toast.success("Lead updated successfully");
      setDialogOpen(false);
      onLeadUpdated?.();
    } catch (error: any) {
      let errorMessage = "Failed to update lead";
      if (error?.details) {
        if (Array.isArray(error.details)) {
          errorMessage = error.details.map((err: any) => err.message || String(err)).join(", ");
        } else if (typeof error.details === "string") {
          errorMessage = error.details;
        }
      } else if (error?.message && typeof error.message === "string") {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const currentCampaign = lead ? campaigns.find(c => c.id === lead.campaignId) : null;

  if (isLoading) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-neutral-900">Basic Information</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternatePhone">Alternate Phone</Label>
                <Input
                  id="alternatePhone"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadType">Lead Type</Label>
                <Select value={leadType} onValueChange={(v) => setLeadType(v as LeadType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Property Preferences */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-900">Property Preferences</h3>
            
            <div className="space-y-2">
              <Label>Property Types</Label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(type => (
                  <Badge
                    key={type.value}
                    variant={propertyTypePreference.includes(type.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePropertyType(type.value)}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Budget Min ($)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetMax">Budget Max ($)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedroomsMin">Min Bedrooms</Label>
                <Input
                  id="bedroomsMin"
                  type="number"
                  value={bedroomsMin}
                  onChange={(e) => setBedroomsMin(e.target.value)}
                  min="0"
                  max="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathroomsMin">Min Bathrooms</Label>
                <Input
                  id="bathroomsMin"
                  type="number"
                  value={bathroomsMin}
                  onChange={(e) => setBathroomsMin(e.target.value)}
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="squareFeetMin">Min Square Feet</Label>
                <Input
                  id="squareFeetMin"
                  type="number"
                  value={squareFeetMin}
                  onChange={(e) => setSquareFeetMin(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location Preferences</Label>
              {locationPreference.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {locationPreference.map(loc => (
                    <Badge key={loc} variant="secondary">
                      {loc}
                      <button
                        type="button"
                        onClick={() => removeLocation(loc)}
                        className="ml-2 text-xs hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add location..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLocation((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-900">Additional Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="moveInTimeline">Move-in Timeline</Label>
                <Select value={moveInTimeline || undefined} onValueChange={(v) => setMoveInTimeline(v as MoveInTimeline)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASAP">ASAP</SelectItem>
                    <SelectItem value="ONE_TO_THREE_MONTHS">1-3 Months</SelectItem>
                    <SelectItem value="THREE_TO_SIX_MONTHS">3-6 Months</SelectItem>
                    <SelectItem value="SIX_TO_TWELVE_MONTHS">6-12 Months</SelectItem>
                    <SelectItem value="OVER_A_YEAR">Over a Year</SelectItem>
                    <SelectItem value="JUST_BROWSING">Just Browsing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentHousingStatus">Current Housing</Label>
                <Select value={currentHousingStatus || undefined} onValueChange={(v) => setCurrentHousingStatus(v as HousingStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RENTING">Renting</SelectItem>
                    <SelectItem value="OWNS_HOME">Owns Home</SelectItem>
                    <SelectItem value="LIVING_WITH_FAMILY">Living with Family</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preApprovalStatus">Pre-Approval Status</Label>
                <Select value={preApprovalStatus || undefined} onValueChange={(v) => setPreApprovalStatus(v as PreApprovalStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PRE_QUALIFIED">Pre-Qualified</SelectItem>
                    <SelectItem value="PRE_APPROVED">Pre-Approved</SelectItem>
                    <SelectItem value="NOT_NEEDED">Not Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preApprovalAmount">Pre-Approval Amount ($)</Label>
                <Input
                  id="preApprovalAmount"
                  type="number"
                  value={preApprovalAmount}
                  onChange={(e) => setPreApprovalAmount(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Management */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-900">Lead Management</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {currentCampaign && (
                <div className="space-y-2">
                  <Label htmlFor="currentStageId">Pipeline Stage</Label>
                  <Select value={currentStageId} onValueChange={setCurrentStageId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentCampaign.pipeline.stages
                        .sort((a, b) => a.order - b.order)
                        .map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="assignedToId">Assigned To</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextFollowUpAt">Next Follow-up Date</Label>
                <Input
                  id="nextFollowUpAt"
                  type="date"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-xs hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  maxLength={50}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
