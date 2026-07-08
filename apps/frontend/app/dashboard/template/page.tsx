"use client";

import { useState, useEffect } from "react";
import {
  Check, ChevronRight, LayoutTemplate, Megaphone, GitMerge,
  Calendar, Users, Settings, FileText, Loader2, Play, Plus, X, UploadCloud, FileSpreadsheet, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  campaigns, pipelines, meetings, leads, workflowsApi, documents, integrations, auth, type User
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { id: "campaign", title: "Campaign", icon: Megaphone },
  { id: "pipeline", title: "Pipeline", icon: GitMerge },
  { id: "meetings", title: "Meetings", icon: Calendar },
  { id: "leads", title: "Leads", icon: Users },
  { id: "workflows", title: "Workflows", icon: Settings },
  { id: "documents", title: "Documents", icon: FileText },
];

export default function TemplateWizardPage() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [createdTemplates, setCreatedTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    if (showWizard) {
      auth.listUsers()
        .then(users => setUsersList(users.filter(u => u.isActive)))
        .catch(console.error);
    }
  }, [showWizard]);

  useEffect(() => {
    if (!showWizard) {
      setLoadingTemplates(true);
      campaigns.list()
        .then(data => setCreatedTemplates(data))
        .catch(err => {
          console.error(err);
          toast.error("Failed to load templates");
        })
        .finally(() => setLoadingTemplates(false));
    }
  }, [showWizard]);

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this template/campaign? This action cannot be undone.")) return;
    try {
      await campaigns.delete(id);
      toast.success("Template deleted successfully");
      setCreatedTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  // --- Wizard State ---
  const [state, setState] = useState({
    campaign: { name: "", budget: "", startDate: new Date().toISOString().split("T")[0], endDate: "", source: "OTHER", assignedToIds: [] as string[] },
    pipeline: {
      name: "", type: "BUYER", stages: [
        { name: "New", color: "#3B82F6", isDefault: true },
        { name: "Contacted", color: "#F59E0B", isDefault: false },
        { name: "Qualified", color: "#10B981", isDefault: false },
        { name: "Proposal", color: "#8B5CF6", isDefault: false }
      ]
    },
    meeting: { title: "", startTime: "", endTime: "" },
    leads: {
      items: [] as { firstName: string; lastName: string; email: string; mobile: string; leadType: string }[],
      file: null as File | null,
      integrationType: "NONE" as "NONE" | "GOOGLE_SHEETS" | "GOOGLE_FORMS" | "GOOGLE_DRIVE",
      integrationUrl: "",
      integrationFolderId: "",
      integrationFileId: "",
      fileHeaders: [] as string[],
      filePreview: [] as Record<string, any>[],
      allRows: [] as Record<string, any>[],
      showSchemaMapping: false,
      columnMappings: [] as { sourceColumn: string; targetField: string; transformFunction?: string; isCustomField?: boolean; customFieldName?: string }[],
    },
    workflows: [{ name: "", trigger: "call_connected", action: "change_stage", destinationStageIndex: 1 }],
    document: { name: "", file: null as File | null }
  });

  const updateState = (key: string, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Step 1: Create Pipeline
      const createdPipeline = await pipelines.create({
        name: state.pipeline.name || `${state.campaign.name || "Default"} Pipeline`,
        type: state.pipeline.type as any,
        stages: state.pipeline.stages.map((s, i) => ({ ...s, order: i }))
      });
      const pipelineId = createdPipeline.id;
      const pipelineStages = createdPipeline.stages; // Assume API returns stages with IDs

      // Step 2: Create Campaign
      const createdCampaign = await campaigns.create({
        name: state.campaign.name || "New Template Campaign",
        source: state.campaign.source as any,
        startDate: new Date(state.campaign.startDate).toISOString(),
        endDate: state.campaign.endDate ? new Date(state.campaign.endDate).toISOString() : undefined,
        budget: state.campaign.budget ? Number(state.campaign.budget) : undefined,
        pipelineId: pipelineId,
        assignedToIds: state.campaign.assignedToIds || []
      });
      const campaignId = createdCampaign.id;

      // Step 3: Create Meeting (if filled)
      if (state.meeting.title && state.meeting.startTime && state.meeting.endTime) {
        await meetings.create({
          title: state.meeting.title,
          startTime: new Date(state.meeting.startTime).toISOString(),
          endTime: new Date(state.meeting.endTime).toISOString()
        });
      }

      // Step 4: Create Leads (if any)
      const firstStageId = pipelineStages[0]?.id;
      if (firstStageId && (state.leads.items.length > 0 || state.leads.file)) {
        toast.loading("Adding initial leads...", { id: "template-creation" });

        // Manual Leads - use bulk import with auto-assign
        if (state.leads.items.length > 0) {
          const validLeads = state.leads.items.filter((lead: any) => lead.firstName);
          if (validLeads.length > 0) {
            const res: any = await leads.bulkImport({
              importData: {
                campaignId,
                defaultStageId: firstStageId,
                defaultPriority: "MEDIUM",
                duplicateHandling: "SKIP",
                duplicateCheckFields: ["email"],
                columnMappings: [
                  { sourceColumn: "firstName", targetField: "firstName", transformFunction: "NONE" },
                  { sourceColumn: "lastName", targetField: "lastName", transformFunction: "NONE" },
                  { sourceColumn: "email", targetField: "email", transformFunction: "NONE" },
                  { sourceColumn: "mobile", targetField: "mobile", transformFunction: "NONE" },
                  { sourceColumn: "leadType", targetField: "leadType", transformFunction: "UPPERCASE" },
                ],
                rows: validLeads.map((lead: any) => ({
                  firstName: lead.firstName,
                  lastName: lead.lastName || "",
                  email: lead.email || "",
                  mobile: lead.mobile || "",
                  leadType: lead.leadType || "BUYER",
                })),
                assignmentMode: "AUTO",
              },
            });
            if (res && res.summary && res.summary.failed > 0) {
              toast.error(`Failed to import ${res.summary.failed} manual leads. Please ensure you provide First Name and either Email or Mobile.`, { id: "template-creation-error" });
            }
          }
        }

        // CSV/Excel Lead Upload with Schema Mapping
        if (state.leads.file && state.leads.columnMappings && state.leads.columnMappings.length > 0) {
          toast.loading("Importing leads from file...", { id: "template-creation" });

          const rowsToImport = state.leads.allRows && state.leads.allRows.length > 0 ? state.leads.allRows : state.leads.filePreview;
          console.log("Template import - rows to import:", rowsToImport?.length, "allRows:", state.leads.allRows?.length, "filePreview:", state.leads.filePreview?.length);
          console.log("Template import - columnMappings:", state.leads.columnMappings);

          const processedMappings = state.leads.columnMappings
            .filter((m: any) => m.targetField && m.targetField !== "__ignore__")
            .map((m: any) => {
              if (m.targetField === "__custom__" || m.isCustomField) {
                const customName = m.customFieldName || m.sourceColumn;
                return {
                  sourceColumn: m.sourceColumn,
                  targetField: customName,
                  isCustomField: true,
                  customFieldName: customName,
                  transformFunction: "NONE"
                };
              }
              return { ...m, transformFunction: m.transformFunction || "NONE" };
            });

          console.log("Template import - processedMappings:", processedMappings);

          if (rowsToImport && rowsToImport.length > 0 && processedMappings.length > 0) {
            try {
              const result: any = await leads.bulkImport({
                importData: {
                  campaignId,
                  defaultStageId: firstStageId,
                  defaultPriority: "MEDIUM",
                  duplicateHandling: "SKIP",
                  duplicateCheckFields: ["email"],
                  columnMappings: processedMappings,
                  rows: rowsToImport,
                  assignmentMode: "AUTO",
                },
              });
              console.log("Template import - result:", result);
              if (result && result.summary) {
                if (result.summary.successful > 0) {
                  toast.success(`Imported ${result.summary.successful} leads from file.`, { id: "template-creation" });
                }
                if (result.summary.failed > 0 || result.summary.skipped > 0) {
                  toast.error(`Failed to import ${result.summary.failed} leads. Skipped ${result.summary.skipped} duplicates. Ensure leads have First Name and either Email or Mobile mapped.`, { id: "template-creation-error" });
                }
                if (result.summary.successful === 0 && result.summary.failed > 0) {
                  throw new Error(`Failed to import any leads. ${result.summary.failed} failed. Please ensure mapped columns include First Name and Email/Mobile.`);
                }
              }
            } catch (err: any) {
              console.error("File import error:", err);
              toast.error(err.message || "Failed to import leads from file", { id: "template-creation" });
              // Propagate error to stop wizard completion if zero leads imported
              throw err; 
            }
          } else {
            console.error("Template import - No rows or mappings to import");
            toast.error("No data to import. Please check your file and mappings.", { id: "template-creation" });
          }
        } else if (state.leads.file) {
          const formData = new FormData();
          formData.append("campaignId", campaignId);
          formData.append("stageId", firstStageId);
          formData.append("file", state.leads.file);
          await integrations.uploadExcelLeads(formData);
        }
      }

      // Integration Config (Sheets)
      if (state.leads.integrationType === "GOOGLE_SHEETS" && state.leads.integrationUrl) {
        try {
          await integrations.saveGoogleSheetsConfig(state.leads.integrationUrl);
        } catch (err) {
          console.error("Failed to save sheets url:", err);
        }
      }

      // Integration Config (Forms)
      if (state.leads.integrationType === "GOOGLE_FORMS" && state.leads.integrationUrl) {
        try {
          await integrations.saveGoogleFormsConfig(state.leads.integrationUrl);
        } catch (err) {
          console.error("Failed to save forms url:", err);
        }
      }

      // Integration Config (Drive)
      if (state.leads.integrationType === "GOOGLE_DRIVE" && state.leads.integrationFolderId) {
        try {
          await integrations.saveGoogleDriveConfig(state.leads.integrationFolderId);
          if (state.leads.integrationFileId) {
            toast.loading("Importing leads from Google Drive file...", { id: "template-creation" });
            const importRes = await integrations.importGoogleDriveFile({
              campaignId,
              stageId: firstStageId,
              fileId: state.leads.integrationFileId
            });
            if (importRes.errors && importRes.errors.length > 0) {
              toast.warning(`Imported ${importRes.imported}, but with ${importRes.errors.length} errors.`);
            } else {
              toast.success(`Imported ${importRes.imported} leads successfully.`);
            }
          }
        } catch (err) {
          console.error("Failed to process drive config/import:", err);
          toast.error("Failed to import leads from Google Drive file");
        }
      }

      // Step 5: Create Workflows (if filled)
      if (state.workflows && state.workflows.length > 0) {
        for (const wf of state.workflows) {
          if (wf.name) {
            const destStageId = pipelineStages[wf.destinationStageIndex]?.id;
            await workflowsApi.create({
              name: wf.name,
              trigger: wf.trigger,
              action: wf.action,
              sourceCampaignId: campaignId,
              destinationStageId: destStageId,
              status: "Active"
            });
          }
        }
      }

      // Step 6: Create Document (if uploaded)
      if (state.document.file) {
        await documents.upload({
          file: state.document.file,
          name: state.document.name || state.document.file.name,
          type: "SHARED"
        });
      }

      toast.success("Project Setup Complete! All entities have been created successfully.", { id: "template-creation" });
      const updatedCampaigns = await campaigns.list();
      setCreatedTemplates(updatedCampaigns);
      setShowWizard(false);
      setCurrentStep(0);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create template resources.", { id: "template-creation" });
    } finally {
      setIsSubmitting(false);
      toast.dismiss("template-creation");
    }
  };

  const StepIcon = STEPS[currentStep].icon;

  if (!showWizard) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-brand-600" />
              Project Templates
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              View your created templates or launch a new project setup flow.
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)} className="bg-brand-600 hover:bg-brand-700 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Create New Template
          </Button>
        </div>

        {loadingTemplates ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {createdTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/dashboard/campaigns/${template.id}`)}>
                <CardHeader className="pb-3 border-b border-neutral-100">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold text-neutral-900">{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200">
                        {template.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm text-neutral-600">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><GitMerge className="w-4 h-4 text-neutral-400" /> Pipeline</span>
                    <span className="font-medium text-neutral-900">{template.pipeline?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-neutral-400" /> Started</span>
                    <span className="font-medium text-neutral-900">{new Date(template.startDate).toLocaleDateString()}</span>
                  </div>
                  {template.budget && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-neutral-400" /> Budget</span>
                      <span className="font-medium text-neutral-900">₹{template.budget}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {createdTemplates.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-neutral-200 shadow-sm">
                <LayoutTemplate className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-1">No templates found</h3>
                <p className="text-neutral-500 mb-6 max-w-md mx-auto">You haven't created any templates yet. Launch the project setup flow to create your first comprehensive campaign.</p>
                <Button onClick={() => setShowWizard(true)} variant="outline">
                  <Play className="w-4 h-4 mr-2" /> Start Wizard
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowWizard(false)} className="text-neutral-400 hover:text-neutral-700">
              <X className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-brand-600" />
              Project Setup Template
            </h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Sequentially create your campaign, pipeline, leads, and workflows in one master flow.
          </p>
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="w-full py-6 relative">
        <div className="absolute top-[46px] left-0 w-full h-0.5 bg-neutral-200 -translate-y-1/2 z-0"></div>
        <div
          className="absolute top-[46px] left-0 h-0.5 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        ></div>

        <div className="flex justify-between relative z-10">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > idx;
            const isCurrent = currentStep === idx;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 transition-all duration-300 ${isCompleted
                    ? "bg-brand-500 border-brand-500 text-white bg-black"
                    : isCurrent
                      ? "bg-white border-brand-500 text-brand-600 shadow-[0_0_15px_rgba(6,81,237,0.3)] border-green-600"
                      : "bg-white border-neutral-300 text-neutral-400"
                    }`}
                >
                  {idx + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isCurrent ? "text-brand-700" : isCompleted ? "text-neutral-700" : "text-neutral-400"}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white border border-neutral-200/60 shadow-lg shadow-neutral-200/20 rounded-2xl p-6 sm:p-10 min-h-[400px] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-neutral-100">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Step {currentStep + 1}: {STEPS[currentStep].title}</h2>
              <p className="text-sm text-neutral-500">Configure your {STEPS[currentStep].title.toLowerCase()} settings for this template.</p>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
            {currentStep === 0 && <CampaignStep state={state.campaign} onChange={(data) => updateState("campaign", data)} usersList={usersList} />}
            {currentStep === 1 && <PipelineStep state={state.pipeline} onChange={(data) => updateState("pipeline", data)} />}
            {currentStep === 2 && <MeetingStep state={state.meeting} onChange={(data) => updateState("meeting", data)} />}
            {currentStep === 3 && <LeadsStep state={state.leads} onChange={(data) => updateState("leads", data)} />}
            {currentStep === 4 && <WorkflowStep state={state.workflows} pipelineStages={state.pipeline.stages} onChange={(data) => updateState("workflows", data)} />}
            {currentStep === 5 && <DocumentStep state={state.document} onChange={(data) => updateState("document", data)} />}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-neutral-100 mt-auto">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="w-32"
          >
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              className="w-32"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-48"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizing...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Launch Project Flow</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STEP COMPONENTS
// ==========================================

function CampaignStep({ state, onChange, usersList }: { state: any, onChange: (val: any) => void, usersList: User[] }) {
  const toggleUserSelection = (userId: string) => {
    const prev = state.assignedToIds || [];
    const next = prev.includes(userId)
      ? prev.filter((id: string) => id !== userId)
      : [...prev, userId];
    onChange({ ...state, assignedToIds: next });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">Campaign Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={state.name}
          onChange={e => onChange({ ...state, name: e.target.value })}
          placeholder="e.g. Summer Real Estate Promo"
          className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">Budget (₹)</label>
        <input
          type="number"
          value={state.budget}
          onChange={e => onChange({ ...state, budget: e.target.value })}
          placeholder="e.g. 5000"
          className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">Start Date <span className="text-red-500">*</span></label>
        <input
          type="date"
          value={state.startDate}
          onChange={e => onChange({ ...state, startDate: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">Source</label>
        <select
          value={state.source}
          onChange={e => onChange({ ...state, source: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
        >
          <option value="FACEBOOK_ADS">Facebook Ads</option>
          <option value="GOOGLE_ADS">Google Ads</option>
          <option value="REFERRAL">Referral</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="space-y-3 col-span-1 md:col-span-2 pt-4 border-t border-neutral-100">
        <label className="text-sm font-medium text-neutral-700">Assigned Users (Optional)</label>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3 bg-white">
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
                  checked={(state.assignedToIds || []).includes(user.id)}
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
        {(state.assignedToIds || []).length > 0 && (
          <p className="text-xs text-neutral-500">
            {(state.assignedToIds || []).length} user{(state.assignedToIds || []).length > 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );
}

function PipelineStep({ state, onChange }: { state: any, onChange: (val: any) => void }) {
  const addStage = () => {
    onChange({
      ...state,
      stages: [...state.stages, { name: "New Stage", color: "#94A3B8", isDefault: false }]
    });
  };

  const updateStage = (idx: number, field: string, val: any) => {
    const newStages = [...state.stages];
    newStages[idx] = { ...newStages[idx], [field]: val };
    onChange({ ...state, stages: newStages });
  };

  const removeStage = (idx: number) => {
    onChange({ ...state, stages: state.stages.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">Pipeline Name</label>
          <input
            type="text"
            value={state.name}
            onChange={e => onChange({ ...state, name: e.target.value })}
            placeholder="Leave blank to use Campaign name"
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">Pipeline Type</label>
          <select
            value={state.type}
            onChange={e => onChange({ ...state, type: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
          >
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="INVESTOR">Investor</option>
            <option value="RENTER">Renter</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-neutral-700">Pipeline Stages</label>
          <Button variant="outline" size="sm" onClick={addStage}><Plus className="w-4 h-4 mr-1" /> Add Stage</Button>
        </div>

        <div className="space-y-3">
          {state.stages.map((stage: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div className="w-6 text-center text-xs font-bold text-neutral-400">{idx + 1}</div>
              <input
                type="color"
                value={stage.color}
                onChange={e => updateStage(idx, "color", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={stage.name}
                onChange={e => updateStage(idx, "name", e.target.value)}
                placeholder="Stage Name"
                className="flex-1 px-3 py-1.5 rounded-md border border-neutral-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <Button variant="ghost" size="icon" onClick={() => removeStage(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetingStep({ state, onChange }: { state: any, onChange: (val: any) => void }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-brand-50 text-brand-800 p-4 rounded-xl border border-brand-100 text-sm">
        Optional: Schedule a kickoff meeting or block out time for this campaign's initial review.
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">Meeting Title</label>
          <input
            type="text"
            value={state.title}
            onChange={e => onChange({ ...state, title: e.target.value })}
            placeholder="e.g. Campaign Kickoff"
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Start Time</label>
            <input
              type="datetime-local"
              value={state.startTime}
              onChange={e => onChange({ ...state, startTime: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">End Time</label>
            <input
              type="datetime-local"
              value={state.endTime}
              onChange={e => onChange({ ...state, endTime: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsStep({ state, onChange }: { state: any, onChange: (val: any) => void }) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [files, setFiles] = useState<{ id: string; name: string; mimeType: string }[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [customFieldNames, setCustomFieldNames] = useState<Record<string, string>>({});

  const LEAD_FIELDS = [
    { value: "firstName", label: "First Name *" },
    { value: "lastName", label: "Last Name" },
    { value: "email", label: "Email" },
    { value: "mobile", label: "Mobile" },
    { value: "alternatePhone", label: "Alternate Phone" },
    { value: "leadType", label: "Lead Type" },
    { value: "budgetMin", label: "Budget Min" },
    { value: "budgetMax", label: "Budget Max" },
    { value: "locationPreference", label: "Location Preference" },
    { value: "bedroomsMin", label: "Min Bedrooms" },
    { value: "bathroomsMin", label: "Min Bathrooms" },
    { value: "squareFeetMin", label: "Min Square Feet" },
    { value: "tags", label: "Tags" },
    { value: "initialNotes", label: "Initial Notes" },
    { value: "__custom__", label: "➕ Custom Field" },
    { value: "__ignore__", label: "🚫 Ignore this column" },
  ];

  useEffect(() => {
    if (state.integrationType === "GOOGLE_DRIVE" && folders.length === 0) {
      setLoadingFolders(true);
      integrations.getGoogleDriveFolders()
        .then(res => setFolders(res.folders || []))
        .catch(console.error)
        .finally(() => setLoadingFolders(false));
    }
  }, [state.integrationType, folders.length]);

  useEffect(() => {
    if (state.integrationType === "GOOGLE_DRIVE" && state.integrationFolderId) {
      setLoadingFiles(true);
      setFiles([]);
      integrations.getGoogleDriveFilesByFolder(state.integrationFolderId)
        .then(res => setFiles(res.files || []))
        .catch(console.error)
        .finally(() => setLoadingFiles(false));
    }
  }, [state.integrationFolderId]);

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const addLead = () => {
    onChange({ ...state, items: [...state.items, { firstName: "", lastName: "", email: "", mobile: "", leadType: "BUYER" }] });
  };

  const updateLead = (idx: number, field: string, val: string) => {
    const newItems = [...state.items];
    newItems[idx] = { ...newItems[idx], [field]: val };
    onChange({ ...state, items: newItems });
  };

  const removeLead = (idx: number) => {
    onChange({ ...state, items: state.items.filter((_: any, i: number) => i !== idx) });
  };

  const parseUploadedFile = async (file: File) => {
    setParsingFile(true);
    try {
      const result = await leads.parseImport({
        sourceType: "FILE",
        file,
      });

      const headers = result.headers;
      const preview = result.preview;

      const autoMappings = headers.map((h): { sourceColumn: string; targetField: string; transformFunction?: string; isCustomField?: boolean; customFieldName?: string } => {
        const lower = h.toLowerCase();
        if (lower.includes("first") && lower.includes("name")) return { sourceColumn: h, targetField: "firstName" };
        if (lower.includes("last") && lower.includes("name")) return { sourceColumn: h, targetField: "lastName" };
        if (lower.includes("email")) return { sourceColumn: h, targetField: "email" };
        if (lower.includes("mobile") || lower.includes("phone") || lower.includes("contact")) return { sourceColumn: h, targetField: "mobile" };
        if (lower.includes("budget") && lower.includes("min")) return { sourceColumn: h, targetField: "budgetMin" };
        if (lower.includes("budget") && lower.includes("max")) return { sourceColumn: h, targetField: "budgetMax" };
        if (lower.includes("type")) return { sourceColumn: h, targetField: "leadType" };
        if (lower.includes("location") || lower.includes("area")) return { sourceColumn: h, targetField: "locationPreference" };
        if (lower.includes("tag")) return { sourceColumn: h, targetField: "tags" };
        if (lower.includes("note")) return { sourceColumn: h, targetField: "initialNotes" };
        return { sourceColumn: h, targetField: "__custom__", isCustomField: true, customFieldName: h };
      });

      onChange({
        ...state,
        file,
        fileHeaders: headers,
        filePreview: preview,
        allRows: result.allRows || result.preview,
        showSchemaMapping: true,
        columnMappings: autoMappings,
      });

      toast.success(`Parsed ${result.totalRows} rows`);
    } catch (error: any) {
      console.error("Error parsing file:", error);
      toast.error(error.message || "Failed to parse file");
    } finally {
      setParsingFile(false);
    }
  };

  const updateMapping = (sourceColumn: string, targetField: string) => {
    const newMappings = state.columnMappings.map((m: any) =>
      m.sourceColumn === sourceColumn ? { 
        ...m, 
        targetField,
        isCustomField: targetField === "__custom__"
      } : m
    );
    if (!newMappings.find((m: any) => m.sourceColumn === sourceColumn)) {
      newMappings.push({ sourceColumn, targetField, isCustomField: targetField === "__custom__" });
    }
    onChange({ ...state, columnMappings: newMappings });
  };

  const updateCustomFieldName = (sourceColumn: string, name: string) => {
    const newMappings = state.columnMappings.map((m: any) =>
      m.sourceColumn === sourceColumn ? { ...m, customFieldName: name } : m
    );
    onChange({ ...state, columnMappings: newMappings });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseUploadedFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Manual / CSV Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-neutral-900">1. Initial Leads (Optional)</p>
          <Button variant="outline" size="sm" onClick={addLead}><Plus className="w-4 h-4 mr-1" /> Add Manual Lead</Button>
        </div>

        {state.file && !state.showSchemaMapping && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              <div>
                <p className="text-sm font-medium text-brand-900">{state.file.name}</p>
                <p className="text-xs text-brand-700">File attached for bulk import ({(state.file.size / 1024).toFixed(1)} KB)</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onChange({ ...state, file: null })}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {state.showSchemaMapping && state.fileHeaders.length > 0 && (
          <div className="space-y-4 border border-brand-200 rounded-xl p-4 bg-brand-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-neutral-900">Schema Mapping</h4>
                <p className="text-xs text-neutral-600">Map columns from your file to lead fields</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onChange({ ...state, file: null, showSchemaMapping: false, fileHeaders: [], columnMappings: [] })}
              >
                <X className="w-4 h-4 mr-1" /> Remove File
              </Button>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">Source Column</th>
                    <th className="text-left p-2 font-medium">Maps To</th>
                    <th className="text-left p-2 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {state.fileHeaders.map((header: string) => {
                    const mapping = state.columnMappings.find((m: any) => m.sourceColumn === header);
                    const previewValue = state.filePreview[0]?.[header] || "";
                    
                    return (
                      <tr key={header} className="border-b last:border-0">
                        <td className="p-2 font-medium">{header}</td>
                        <td className="p-2">
                          <select
                            value={mapping?.targetField || ""}
                            onChange={(e) => updateMapping(header, e.target.value)}
                            className="w-full px-2 py-1 rounded border border-neutral-300 text-sm"
                          >
                            <option value="">Skip</option>
                            {LEAD_FIELDS.map(field => (
                              <option key={field.value} value={field.value}>{field.label}</option>
                            ))}
                          </select>
                          {mapping?.targetField === "__custom__" && (
                            <input
                              type="text"
                              placeholder="Custom field name"
                              value={mapping.customFieldName || ""}
                              onChange={(e) => updateCustomFieldName(header, e.target.value)}
                              className="mt-1 w-full px-2 py-1 rounded border border-purple-300 text-sm"
                            />
                          )}
                        </td>
                        <td className="p-2 text-neutral-600 max-w-[200px] truncate">{String(previewValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 text-xs text-brand-700">
              <Badge variant="outline" className="bg-brand-50">
                {state.fileHeaders.length} columns
              </Badge>
              <Badge variant="outline" className="bg-brand-50">
                {state.filePreview.length} preview rows
              </Badge>
            </div>
          </div>
        )}

        {state.items.length === 0 && !state.file ? (
          <div className="text-center py-6 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50">
            <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No initial leads added.</p>
            <div className="mt-4 flex justify-center gap-4">
              <Button variant="outline" size="sm" onClick={addLead}><Plus className="w-4 h-4 mr-1" /> Add Manually</Button>
              <div>
                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" id="leads-file-upload" onChange={handleFileChange} />
                <Label htmlFor="leads-file-upload" className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 h-9 px-3">
                  <UploadCloud className="w-4 h-4" /> Upload CSV/Excel
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {state.items.map((lead: any, idx: number) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-neutral-500">First Name</label>
                  <input type="text" value={lead.firstName} onChange={e => updateLead(idx, "firstName", e.target.value)} className="w-full px-3 py-1.5 rounded border border-neutral-300 text-sm" />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-neutral-500">Last Name</label>
                  <input type="text" value={lead.lastName} onChange={e => updateLead(idx, "lastName", e.target.value)} className="w-full px-3 py-1.5 rounded border border-neutral-300 text-sm" />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-neutral-500">Phone</label>
                  <input type="text" value={lead.mobile} onChange={e => updateLead(idx, "mobile", e.target.value)} className="w-full px-3 py-1.5 rounded border border-neutral-300 text-sm" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-neutral-500">Type</label>
                  <select value={lead.leadType} onChange={e => updateLead(idx, "leadType", e.target.value)} className="w-full px-3 py-1.5 rounded border border-neutral-300 text-sm bg-white">
                    <option value="BUYER">Buyer</option>
                    <option value="SELLER">Seller</option>
                  </select>
                </div>
                <div className="sm:col-span-1 flex justify-end pb-0.5">
                  <Button variant="ghost" size="icon" onClick={() => removeLead(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-neutral-100" />

      {/* Auto-Sync Integrations Section */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-neutral-900">2. Auto-Sync Integration (Optional)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Integration Type</label>
            <select
              value={state.integrationType}
              onChange={e => onChange({ ...state, integrationType: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
            >
              <option value="NONE">None</option>
              <option value="GOOGLE_SHEETS">Google Sheets</option>
              <option value="GOOGLE_FORMS">Google Forms</option>
              <option value="GOOGLE_DRIVE">Google Drive</option>
            </select>
          </div>

          {state.integrationType === "GOOGLE_DRIVE" ? (
            <div className="space-y-4 col-span-1 md:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Google Drive Folder</label>
                {loadingFolders ? (
                  <div className="text-sm text-neutral-500 py-2">Loading folders...</div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search folders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                    />
                    <select
                      value={state.integrationFolderId}
                      onChange={e => onChange({ ...state, integrationFolderId: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
                      size={4}
                    >
                      <option value="">Select a folder</option>
                      {filteredFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {state.integrationFolderId && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <label className="text-sm font-medium text-neutral-700">Select File to Import (Optional)</label>
                  {loadingFiles ? (
                    <div className="text-sm text-neutral-500 py-2">Loading files...</div>
                  ) : files.length > 0 ? (
                    <select
                      value={state.integrationFileId}
                      onChange={e => onChange({ ...state, integrationFileId: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
                    >
                      <option value="">Select an Excel/CSV file</option>
                      {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  ) : (
                    <div className="text-sm text-neutral-500 py-2">No spreadsheets or CSV files found in this folder.</div>
                  )}
                </div>
              )}
            </div>
          ) : state.integrationType !== "NONE" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">
                {state.integrationType === "GOOGLE_SHEETS" ? "Google Sheets URL" : "Google Forms URL"}
              </label>
              <input
                type="text"
                value={state.integrationUrl}
                onChange={e => onChange({ ...state, integrationUrl: e.target.value })}
                placeholder="https://docs.google.com/..."
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          )}
        </div>

        {state.integrationType !== "NONE" && (
          <div className="bg-brand-50 text-brand-800 p-4 rounded-xl border border-brand-100 text-sm mt-4 col-span-1 md:col-span-2">
            {state.integrationType === "GOOGLE_DRIVE" && state.integrationFileId ? (
              <p><strong>Note:</strong> We will automatically parse and import leads from the selected file. Ensure your file has standard column headers (First Name, Last Name, Email, Mobile).</p>
            ) : (
              <p><strong>Note:</strong> We will link this configuration to your new campaign.
                Once the setup wizard is complete, you will still need to visit the <strong>Integrations</strong> page from the sidebar to map fields or initiate the actual sync!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowStep({ state, pipelineStages, onChange }: { state: any[], pipelineStages: any[], onChange: (val: any) => void }) {
  const addWorkflow = () => {
    onChange([...state, { name: "", trigger: "call_connected", action: "change_stage", destinationStageIndex: 1 }]);
  };

  const updateWorkflow = (idx: number, field: string, val: any) => {
    const newWf = [...state];
    newWf[idx] = { ...newWf[idx], [field]: val };
    onChange(newWf);
  };

  const removeWorkflow = (idx: number) => {
    onChange(state.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl border border-indigo-100 text-sm flex gap-3 flex-1 mr-4">
          <Settings className="w-5 h-5 shrink-0" />
          <p>Define automation rules for this template. For example, automatically move a lead's stage when a call is connected.</p>
        </div>
        <Button variant="outline" size="sm" onClick={addWorkflow} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Add Workflow
        </Button>
      </div>

      <div className="space-y-4">
        {state.map((wf, idx) => (
          <div key={idx} className="relative bg-neutral-50 p-5 rounded-xl border border-neutral-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeWorkflow(idx)}
              className="absolute top-3 right-3 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-neutral-700">Workflow Name</label>
                <input
                  type="text"
                  value={wf.name}
                  onChange={e => updateWorkflow(idx, "name", e.target.value)}
                  placeholder="e.g. Auto-Advance on Contact"
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">When this happens (Trigger)</label>
                <select
                  value={wf.trigger}
                  onChange={e => updateWorkflow(idx, "trigger", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
                >
                  <option value="call_connected">Call is Connected</option>
                  <option value="call_disconnected">Call is Unanswered</option>
                  <option value="email_sent">Email is Sent</option>
                  <option value="meeting_scheduled">Meeting is Scheduled</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Move lead to stage (Action)</label>
                <select
                  value={wf.destinationStageIndex}
                  onChange={e => updateWorkflow(idx, "destinationStageIndex", parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white"
                >
                  {pipelineStages.map((stage, sIdx) => (
                    <option key={sIdx} value={sIdx}>{stage.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {state.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50">
            <p className="text-sm font-medium text-neutral-600">No workflows defined.</p>
            <p className="text-xs text-neutral-400 mt-1">Click "Add Workflow" to automate your pipeline.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentStep({ state, onChange }: { state: any, onChange: (val: any) => void }) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange({ ...state, file: e.target.files[0], name: e.target.files[0].name });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">Project Master Document</label>
        <p className="text-sm text-neutral-500 mb-4">Attach a master brochure, price list, or briefing document for this project.</p>

        <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-10 text-center hover:bg-neutral-50 transition-colors cursor-pointer relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 mb-4">
              <FileText className="w-8 h-8" />
            </div>
            {state.file ? (
              <div>
                <p className="text-sm font-semibold text-brand-600">{state.name}</p>
                <p className="text-xs text-neutral-500 mt-1">Ready to upload</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-neutral-900">Click to upload or drag and drop</p>
                <p className="text-xs text-neutral-500 mt-1">PDF, DOCX, PNG up to 10MB</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
