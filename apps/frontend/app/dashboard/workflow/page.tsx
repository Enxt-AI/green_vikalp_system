"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash, Play, Pause, Settings, GitMerge } from "lucide-react";
import { campaigns as campaignsApi, pipelines as pipelinesApi, workflowsApi, type Campaign, type Pipeline, type Workflow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function WorkflowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [actionType, setActionType] = useState("move_lead");
  const [pipelineList, setPipelineList] = useState<Pipeline[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [trigger, setTrigger] = useState("call_connected");
  const [sourceCampaignId, setSourceCampaignId] = useState("");
  const [stageId, setStageId] = useState("");
  const [tag, setTag] = useState("");
  const [destinationCampaignId, setDestinationCampaignId] = useState("");
  const [destinationStageId, setDestinationStageId] = useState("");
  const [assignmentOption, setAssignmentOption] = useState("follow_destination");

  const loadWorkflows = () => {
    workflowsApi.list().then(setWorkflows).catch(console.error);
  };

  useEffect(() => {
    campaignsApi.list().then(setCampaignList).catch(console.error);
    pipelinesApi.list().then(setPipelineList).catch(console.error);
    loadWorkflows();
  }, []);

  const resetForm = () => {
    setEditingWorkflowId(null);
    setTrigger("call_connected");
    setSourceCampaignId("");
    setStageId("");
    setTag("");
    setActionType("move_lead");
    setDestinationCampaignId("");
    setDestinationStageId("");
    setAssignmentOption("follow_destination");
  };

  const handleSaveWorkflow = async () => {
    try {
      setIsSubmitting(true);
      const data = {
        trigger,
        sourceCampaignId,
        stageId,
        tag,
        action: actionType,
        destinationCampaignId: actionType === "move_lead" ? destinationCampaignId : "",
        destinationStageId: (actionType === "move_lead" || actionType === "change_stage") ? destinationStageId : "",
        assignmentOption,
      };

      if (editingWorkflowId) {
        await workflowsApi.update(editingWorkflowId, data);
        toast.success("Workflow updated successfully");
      } else {
        await workflowsApi.create(data);
        toast.success("Workflow created successfully");
      }
      setIsCreateOpen(false);
      resetForm();
      loadWorkflows(); // Refresh list
    } catch (error) {
      console.error("Failed to save workflow", error);
      toast.error("Failed to save workflow");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    try {
      const newStatus = workflow.status === 'Active' ? 'Inactive' : 'Active';
      await workflowsApi.update(workflow.id, { status: newStatus });
      toast.success(`Workflow marked as ${newStatus}`);
      loadWorkflows();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update workflow status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await workflowsApi.delete(id);
      toast.success("Workflow deleted successfully");
      loadWorkflows();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete workflow");
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflowId(workflow.id);
    setTrigger(workflow.trigger);
    setSourceCampaignId(workflow.sourceCampaignId || "");
    setStageId(workflow.stageId || "");
    setTag(workflow.tag || "");
    setActionType(workflow.action);
    setDestinationCampaignId(workflow.destinationCampaignId || "");
    setDestinationStageId(workflow.destinationStageId || "");
    setAssignmentOption(workflow.assignmentOption || "follow_destination");
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-brand-600" />
            Workflows
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Automate tasks and communications.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white border shadow-sm" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh] p-0">
            <div className="px-6 pt-6 pb-2">
              <DialogHeader>
                <DialogTitle>{editingWorkflowId ? "Edit Workflow" : "Create Workflow"}</DialogTitle>
                <DialogDescription>
                  {editingWorkflowId ? "Update your workflow settings." : "Automate your processes by setting up triggers and actions."}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-6 px-6 py-4 overflow-y-auto flex-1">
              {/* Trigger Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-neutral-900 border-b pb-2">Event</h3>

                <div className="grid gap-2">
                  <Label htmlFor="event">Choose when to trigger this workflow <span className="text-red-500">*</span></Label>
                  <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call_connected">Call Connected</SelectItem>
                      <SelectItem value="call_disconnected">Call Disconnected</SelectItem>
                      <SelectItem value="lead_created">Lead Created</SelectItem>
                      <SelectItem value="lead_updated">Lead Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="source_campaign">Source Campaign <span className="text-red-500">*</span></Label>
                  <Select value={sourceCampaignId} onValueChange={setSourceCampaignId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source campaign to monitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignList.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-neutral-500">Select source campaign to monitor</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="stage">Stages (Optional)</Label>
                  <Select value={stageId} onValueChange={setStageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineList.map((pipeline) => (
                        <SelectGroup key={pipeline.id}>
                          <SelectLabel>{pipeline.name}</SelectLabel>
                          {pipeline.stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-neutral-500">Select a Stage which should be taken into consideration</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tag">Tags (Optional)</Label>
                  <Select value={tag} onValueChange={setTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-neutral-500">Select a Tag which should be taken into consideration</p>
                </div>
              </div>

              {/* Actions Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-neutral-900 border-b pb-2">Actions</h3>

                <div className="grid gap-2">
                  <Label>What happens when conditions are met?</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="move_lead">Move Lead</SelectItem>
                      <SelectItem value="change_stage">Change Stage</SelectItem>
                      <SelectItem value="send_whatsapp">Send WhatsApp</SelectItem>
                      <SelectItem value="send_sms">Send SMS</SelectItem>
                      <SelectItem value="schedule_follow_up">Schedule Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={`grid gap-2 transition-opacity ${actionType !== "move_lead" ? "opacity-50 pointer-events-none hidden" : ""}`}>
                  <Label>Destination Campaign</Label>
                  <Select disabled={actionType !== "move_lead"} value={destinationCampaignId} onValueChange={setDestinationCampaignId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignList.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-neutral-500">Select which campaign should the new lead be created into</p>
                </div>

                <div className={`grid gap-2 transition-opacity ${(actionType !== "move_lead" && actionType !== "change_stage") ? "opacity-50 pointer-events-none hidden" : ""}`}>
                  <Label>Destination Stage</Label>
                  <Select disabled={actionType !== "move_lead" && actionType !== "change_stage"} value={destinationStageId} onValueChange={setDestinationStageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineList.map((pipeline) => (
                        <SelectGroup key={pipeline.id}>
                          <SelectLabel>{pipeline.name}</SelectLabel>
                          {pipeline.stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-neutral-500">Select which stage the lead should be moved to</p>
                </div>

                <div className="grid gap-2">
                  <Label>Assignment Option</Label>
                  <Select value={assignmentOption} onValueChange={setAssignmentOption}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow_destination">Follow destination campaign's setting</SelectItem>
                      <SelectItem value="keep_same_user">Keep the same user</SelectItem>
                      <SelectItem value="specify">Specify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 mt-auto rounded-b-lg">
              <DialogFooter className="flex flex-row justify-end gap-3 sm:gap-3 w-full">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleSaveWorkflow}
                  disabled={isSubmitting || !sourceCampaignId}
                >
                  {isSubmitting ? (editingWorkflowId ? "Updating..." : "Creating...") : (editingWorkflowId ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200/60 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 bg-neutral-50 uppercase border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Workflow Name</th>
                <th className="px-6 py-4 font-semibold">Trigger</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Last Run</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {workflows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-neutral-500 mb-1">No workflows found.</p>
                    <p className="text-sm text-neutral-400">Click "Create Workflow" to get started.</p>
                  </td>
                </tr>
              ) : (
                workflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">{workflow.name}</td>
                    <td className="px-6 py-4 text-neutral-600">{workflow.trigger}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${workflow.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${workflow.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {workflow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">{workflow.lastRun}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button onClick={() => handleToggleStatus(workflow)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-brand-600 hover:bg-brand-50" title={workflow.status === 'Active' ? 'Pause Workflow' : 'Resume Workflow'}>
                          {workflow.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button onClick={() => handleEdit(workflow)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-brand-600 hover:bg-brand-50" title="Edit Workflow">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDelete(workflow.id)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50" title="Delete Workflow">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
