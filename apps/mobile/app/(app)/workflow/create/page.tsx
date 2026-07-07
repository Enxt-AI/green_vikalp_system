"use client";

import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { campaigns as campaignsApi, pipelines as pipelinesApi, workflowsApi, type Campaign, type Pipeline } from "@/lib/api";

export default function MobileWorkflowCreatePage() {
  const router = useRouter();
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [pipelineList, setPipelineList] = useState<Pipeline[]>([]);
  const [actionType, setActionType] = useState("move_lead");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [trigger, setTrigger] = useState("call_connected");
  const [sourceCampaignId, setSourceCampaignId] = useState("");
  const [stageId, setStageId] = useState("");
  const [tag, setTag] = useState("");
  const [destinationCampaignId, setDestinationCampaignId] = useState("");
  const [assignmentOption, setAssignmentOption] = useState("follow");

  const handleCreateWorkflow = async () => {
    if (!sourceCampaignId) return;
    
    try {
      setIsSubmitting(true);
      await workflowsApi.create({
        trigger,
        sourceCampaignId,
        stageId: stageId || null,
        tag: tag || null,
        action: actionType,
        destinationCampaignId: actionType === "move_lead" ? destinationCampaignId : null,
        assignmentOption,
      });
      router.back();
    } catch (error) {
      console.error("Failed to create workflow", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    campaignsApi.list().then(setCampaignList).catch(console.error);
    pipelinesApi.list().then(setPipelineList).catch(console.error);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 pb-[70px]">
      <MobileHeader title="Create Workflow" showBack={true} />

      <div className="flex-1 overflow-y-auto p-4">
        
        <div className="space-y-6">
          {/* Event Details */}
          <div className="bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-neutral-100 p-5">
            <h2 className="text-sm font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Event</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Choose when to trigger this workflow</label>
                <div className="relative">
                  <select 
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="call_connected">Call Connected</option>
                    <option value="call_disconnected">Call Disconnected</option>
                    <option value="lead_created">Lead Created</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Source Campaign</label>
                <div className="relative">
                  <select 
                    value={sourceCampaignId}
                    onChange={(e) => setSourceCampaignId(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="">Select source campaign</option>
                    {campaignList.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Select source campaign to monitor</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Stages (Optional)</label>
                <div className="relative">
                  <select 
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="">Select a Stage</option>
                    {pipelineList.map((pipeline) => (
                      <optgroup key={pipeline.id} label={pipeline.name}>
                        {pipeline.stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Tags (Optional)</label>
                <div className="relative">
                  <select 
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="">Choose Tag</option>
                    <option value="vip">VIP</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Details */}
          <div className="bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-neutral-100 p-5">
            <h2 className="text-sm font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Actions</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">What happens when conditions are met?</label>
                <div className="relative">
                  <select 
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="move_lead">Move Lead</option>
                    <option value="send_whatsapp">Send WhatsApp</option>
                    <option value="send_sms">Send SMS</option>
                    <option value="schedule_follow_up">Schedule Follow-up</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div className={`transition-opacity ${actionType !== "move_lead" ? "opacity-50 pointer-events-none" : ""}`}>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Destination</label>
                <div className="relative">
                  <select 
                    disabled={actionType !== "move_lead"}
                    value={destinationCampaignId}
                    onChange={(e) => setDestinationCampaignId(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="">Select destination campaign</option>
                    {campaignList.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Select which campaign should the new lead be created into</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Assignment Option</label>
                <div className="relative">
                  <select 
                    value={assignmentOption}
                    onChange={(e) => setAssignmentOption(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  >
                    <option value="follow">Follow destination campaign's setting</option>
                    <option value="keep">Keep the same user</option>
                    <option value="specify">Specify</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2 pb-6">
            <button 
              onClick={handleCreateWorkflow}
              disabled={isSubmitting || !sourceCampaignId}
              className="w-full bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(6,81,237,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(6,81,237,0.23)]"
            >
              {isSubmitting ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
