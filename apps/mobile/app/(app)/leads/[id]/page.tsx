"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { leads as leadsApi, interactions as interactionsApi, documents as documentsApi, type Lead } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, MessageSquare, ChevronDown, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LeadDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<"LEAD_INFO" | "DISPOSE_LEAD" | "OTHER">("LEAD_INFO");
  const [infoTab, setInfoTab] = useState<"ABOUT" | "TIMELINE">("ABOUT");
  const [isLoading, setIsLoading] = useState(true);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const TABS = ["LEAD_INFO", "DISPOSE_LEAD", "OTHER"] as const;
    const currentIndex = TABS.indexOf(activeTab);
    
    if (isLeftSwipe && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1]);
    }
  };

  // Dispose Lead state
  const [disposeState, setDisposeState] = useState({ date: "", time: "" });
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [disposeRemark, setDisposeRemark] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDisposing, setIsDisposing] = useState(false);

  // Other tab state
  const [newStageId, setNewStageId] = useState<string>("");
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [previousAttachment, setPreviousAttachment] = useState<{name: string, url: string} | null>(null);

  useEffect(() => {
    if (lead?.budgetMax) {
      setDealAmount(lead.budgetMax.toString());
    }
  }, [lead?.budgetMax]);

  const handleCombinedSubmit = async () => {
    if (!lead) return;

    // Validation for Dispose Lead form
    if (isConnected === null && (disposeRemark || selectedFile || (disposeState.date && disposeState.time) || dealAmount)) {
      toast.error("Please specify if the call was connected in the Dispose Lead tab");
      return;
    }

    if (isConnected === false && (!disposeState.date || !disposeState.time)) {
      toast.error("Please select a next action (follow-up date and time) since the call was not connected");
      return;
    }

    // Ensure at least one action is being taken
    if (isConnected === null && (!newStageId || newStageId === lead.currentStage.id)) {
      toast.error("Please select a new pipeline stage or fill out the dispose lead form");
      return;
    }

    setIsDisposing(true);
    setIsUpdatingStage(true);

    try {
      // 1. Dispose Logic
      if (isConnected !== null) {
        let finalRemark = disposeRemark || (isConnected ? "Call connected successfully." : "Call was not connected.");
        
        // Upload file if selected
        if (selectedFile) {
          toast.info("Uploading attachment...");
          const doc = await documentsApi.upload({
            file: selectedFile,
            type: "SHARED"
          });
          
          try {
            const viewData = await documentsApi.getViewUrl(doc.id);
            finalRemark += `\n\n[Attachment: ${doc.name}](${viewData.url})`;
          } catch (err) {
            finalRemark += `\n\n[Attachment: ${doc.name}] (Document ID: ${doc.id})`;
          }
        }

        await interactionsApi.create({
          leadId: lead.id,
          type: "CALL",
          subject: isConnected ? "Call - Connected" : "Call - Unconnected",
          content: finalRemark,
          direction: "OUTBOUND",
          duration: isConnected ? 1 : 0,
          occurredAt: new Date().toISOString(),
        });

        const updates: any = {};
        
        // If we explicitly set a follow up date/time
        if (disposeState.date && disposeState.time) {
          updates.nextFollowUpAt = new Date(`${disposeState.date}T${disposeState.time}`).toISOString();
        } else if (newStageId && newStageId !== lead.currentStage.id) {
          // If we didn't set a follow up date/time, BUT we changed the stage, clear the existing follow up
          updates.nextFollowUpAt = null;
        }
        
        if (dealAmount && !isNaN(parseFloat(dealAmount)) && parseFloat(dealAmount) !== lead.budgetMax) {
          updates.budgetMax = parseFloat(dealAmount);
        }

        if (Object.keys(updates).length > 0) {
          await leadsApi.update(lead.id, updates);
        }
      } else {
        // If we ONLY changed the stage without doing dispose
        if (newStageId && newStageId !== lead.currentStage.id) {
          await leadsApi.update(lead.id, { nextFollowUpAt: null });
        }
      }

      // 2. Stage Update Logic
      if (newStageId && newStageId !== lead.currentStage.id) {
        await leadsApi.updateStage(lead.id, newStageId);
      }

      // Re-fetch lead to get latest state from background workflow engine
      const refreshedLead = await leadsApi.get(lead.id);
      setLead(refreshedLead);

      toast.success("Lead updated successfully!");
      setDisposeRemark("");
      setSelectedFile(null);
      setIsConnected(null);
      setDisposeState({ date: "", time: "" });
      setActiveTab("LEAD_INFO");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update lead");
    } finally {
      setIsDisposing(false);
      setIsUpdatingStage(false);
    }
  };

  const handleQuickAction = (hours: number) => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + hours);
    
    // Format date as YYYY-MM-DD
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    
    // Format time as HH:MM
    const hh = String(futureDate.getHours()).padStart(2, '0');
    const min = String(futureDate.getMinutes()).padStart(2, '0');
    
    setDisposeState({
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`
    });
  };

  // Timer logic
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    async function fetchLead() {
      try {
        const data = await leadsApi.get(id as string);
        setLead(data);

        // Prepopulate Dispose Lead state from latest CALL interaction
        if (data.budgetMax) {
          setDealAmount(data.budgetMax.toString());
        }

        if (data.nextFollowUpAt) {
          const dateObj = new Date(data.nextFollowUpAt);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const hh = String(dateObj.getHours()).padStart(2, '0');
          const min = String(dateObj.getMinutes()).padStart(2, '0');
          setDisposeState({
            date: `${yyyy}-${mm}-${dd}`,
            time: `${hh}:${min}`
          });
        }

        const latestCall = data.interactions?.find((i: any) => i.type === "CALL");
        if (latestCall) {
          let remark = latestCall.content || "";
          
          // Check if there is an attachment in the remark
          const attachmentMatch = remark.match(/\n\n\[Attachment: (.*?)\]\((.*?)\)/);
          if (attachmentMatch) {
            remark = remark.replace(attachmentMatch[0], "");
            setPreviousAttachment({ name: attachmentMatch[1], url: attachmentMatch[2] });
          } else {
            const fallbackMatch = remark.match(/\n\n\[Attachment: (.*?)\] \(Document ID: (.*?)\)/);
            if (fallbackMatch) {
              remark = remark.replace(fallbackMatch[0], "");
              setPreviousAttachment({ name: fallbackMatch[1], url: "" });
            }
          }

          // Clean default remarks
          if (remark === "Call connected successfully." || remark === "Call was not connected.") {
            remark = "";
          }

          setDisposeRemark(remark);
          setIsConnected(latestCall.subject === "Call - Connected");
        }

      } catch (error) {
        toast.error("Failed to fetch lead details");
        router.back();
      } finally {
        setIsLoading(false);
      }
    }
    fetchLead();
  }, [id, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = () => {
    if (lead?.mobile) {
      window.location.href = `tel:${lead.mobile}`;
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="flex h-screen flex-col bg-brand-50">
        <MobileHeader title="Loading..." />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title={lead.firstName} />

      {/* Tabs */}
      <div className="flex bg-brand-800 text-white shadow-md">
        {(["LEAD_INFO", "DISPOSE_LEAD", "OTHER"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-4 ${
              activeTab === tab 
                ? "border-white text-white" 
                : "border-transparent text-brand-200"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div 
        className="flex-1 overflow-y-auto pb-[100px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        
        {activeTab === "LEAD_INFO" && (
          <div className="p-4 space-y-4">
            {/* Timer and Tags */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-brand-100">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-mono text-lg font-semibold text-brand-950">{formatTime(elapsedSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-brand-100 text-brand-700 text-xs font-bold uppercase">{lead.currentStage.name}</span>
                <span className="px-3 py-1 rounded bg-brand-50 text-brand-500 text-xs font-bold uppercase border border-brand-200">#TAG</span>
              </div>
            </div>

            {/* Main Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
              <div className="bg-brand-50 px-4 py-3 border-b border-brand-100 flex justify-between items-center">
                <h3 className="font-bold text-brand-900 text-lg">{lead.firstName} {lead.lastName}</h3>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded text-brand-600 border border-brand-200">{lead.leadType}</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-brand-500 font-semibold uppercase">Mobile Number</p>
                    <p className="text-sm font-bold text-brand-900">{lead.mobile || "No number"}</p>
                  </div>
                  <div className="flex gap-2">
                    {lead.mobile ? (
                      <a href={`tel:${lead.mobile}`} className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center border border-green-200 active:bg-green-100">
                        <Phone className="h-4 w-4 text-green-600" />
                      </a>
                    ) : (
                      <button onClick={handleCall} className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center border border-green-200 active:bg-green-100">
                        <Phone className="h-4 w-4 text-green-600" />
                      </button>
                    )}
                    {lead.mobile ? (
                      <a href={`https://wa.me/${lead.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-200 active:bg-green-600">
                        <MessageCircle className="h-5 w-5 text-white" />
                      </a>
                    ) : (
                      <button className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-200 active:bg-green-600">
                        <MessageCircle className="h-5 w-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-brand-500 font-semibold uppercase">Email Address</p>
                    <p className="text-sm font-bold text-brand-900">{lead.email || "No email"}</p>
                  </div>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-200 active:bg-blue-100">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </a>
                  ) : (
                    <button className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-200 active:bg-blue-100">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
              <div className="bg-brand-50 px-4 py-3 border-b border-brand-100">
                <h3 className="font-bold text-brand-900">Campaign Details</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between border-b border-brand-50 pb-2">
                  <span className="text-xs text-brand-500 font-semibold uppercase">Campaign</span>
                  <span className="text-sm font-bold text-brand-900">{lead.campaign?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-xs text-brand-500 font-semibold uppercase">Created At</span>
                  <span className="text-sm font-bold text-brand-900">{new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              {lead.mobile ? (
                <a href={`https://wa.me/${lead.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm border border-brand-100 text-brand-600 active:bg-brand-50">
                  <MessageCircle className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase">WhatsApp</span>
                </a>
              ) : (
                <button className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm border border-brand-100 text-brand-600 active:bg-brand-50">
                  <MessageCircle className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase">WhatsApp</span>
                </button>
              )}
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm border border-brand-100 text-brand-600 active:bg-brand-50">
                  <Mail className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase">Email</span>
                </a>
              ) : (
                <button className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm border border-brand-100 text-brand-600 active:bg-brand-50">
                  <Mail className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase">Email</span>
                </button>
              )}
              {lead.mobile ? (
                <a href={`sms:${lead.mobile}`} className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm border border-brand-100 text-brand-600 active:bg-brand-50">
                  <MessageSquare className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase">SMS</span>
                </a>
              ) : (
                <button className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm border border-brand-100 text-brand-600 active:bg-brand-50">
                  <MessageSquare className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase">SMS</span>
                </button>
              )}
            </div>

            {/* Deal Amount */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
              <div className="bg-brand-50 px-4 py-2 border-b border-brand-100 text-xs font-bold text-brand-500 uppercase">
                Deal Amount
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-brand-900">₹ {lead.budgetMax || 0}</span>
                </div>
              </div>
            </div>

            {/* Sub-tabs (About / Timeline) */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden mt-4">
              <div className="flex border-b border-brand-100">
                <button 
                  onClick={() => setInfoTab("ABOUT")}
                  className={`flex-1 py-3 text-sm font-bold ${
                    infoTab === "ABOUT" ? "text-brand-600 border-b-2 border-brand-600" : "text-brand-400"
                  }`}
                >ABOUT</button>
                <button 
                  onClick={() => setInfoTab("TIMELINE")}
                  className={`flex-1 py-3 text-sm font-bold ${
                    infoTab === "TIMELINE" ? "text-brand-600 border-b-2 border-brand-600" : "text-brand-400"
                  }`}
                >TIMELINE</button>
              </div>
              
              {infoTab === "ABOUT" && (
                <div className="p-4 space-y-4">
                  <div className="flex justify-between border-b border-brand-50 pb-2">
                    <span className="text-xs text-brand-500 font-semibold uppercase">Contact Name</span>
                    <span className="text-sm font-bold text-brand-900">{lead.firstName} {lead.lastName}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-50 pb-2">
                    <span className="text-xs text-brand-500 font-semibold uppercase">Mobile Number</span>
                    <span className="text-sm font-bold text-brand-900">{lead.mobile || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-50 pb-2">
                    <span className="text-xs text-brand-500 font-semibold uppercase">Campaign</span>
                    <span className="text-sm font-bold text-brand-900">{lead.campaign?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-xs text-brand-500 font-semibold uppercase">Created At</span>
                    <span className="text-sm font-bold text-brand-900">{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {infoTab === "TIMELINE" && (
                <div className="p-4 space-y-4">
                  {(!lead.interactions || lead.interactions.length === 0) ? (
                    <div className="text-center py-6 text-brand-400 text-sm">
                      No recent interactions
                    </div>
                  ) : (
                    <div className="space-y-6 border-l-2 border-brand-100 ml-3 pl-4">
                      {lead.interactions.map((interaction: any) => (
                        <div key={interaction.id} className="relative">
                          <div className="absolute -left-[23px] top-0 h-4 w-4 rounded-full bg-brand-50 border-2 border-brand-300"></div>
                          <p className="text-xs text-brand-400 font-medium">{new Date(interaction.occurredAt).toLocaleString()}</p>
                          <p className="text-sm font-bold text-brand-900 mt-0.5">{interaction.type}</p>
                          {interaction.notes && (
                            <p className="text-sm text-brand-600 mt-1 bg-brand-50 p-2 rounded-lg">{interaction.notes}</p>
                          )}
                          <p className="text-xs text-brand-500 mt-2">By {interaction.createdBy?.fullName || "System"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "DISPOSE_LEAD" && (
          <div className="p-4 space-y-6">
            <div>
              <p className="text-sm font-bold text-brand-900 mb-3">Was call connected?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsConnected(false)}
                  className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${
                    isConnected === false 
                      ? "border-red-500 bg-red-50 text-red-700" 
                      : "border-brand-200 text-brand-700 bg-white active:bg-brand-50"
                  }`}
                >
                  Not Connected
                </button>
                <button 
                  onClick={() => setIsConnected(true)}
                  className={`flex-1 py-3 rounded-lg border-2 font-semibold transition-colors ${
                    isConnected === true 
                      ? "border-green-500 bg-green-50 text-green-700" 
                      : "border-brand-200 text-brand-700 bg-white active:bg-brand-50"
                  }`}
                >
                  Yes Connected
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-brand-900 mb-3">Select next action</p>
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => handleQuickAction(1)}
                  className="px-4 py-2 rounded-full border border-brand-200 text-sm font-medium text-brand-700 active:bg-brand-50"
                >1 hour</button>
                <button 
                  onClick={() => handleQuickAction(6)}
                  className="px-4 py-2 rounded-full border border-brand-200 text-sm font-medium text-brand-700 active:bg-brand-50"
                >6 hour</button>
                <button 
                  onClick={() => handleQuickAction(24)}
                  className="px-4 py-2 rounded-full border border-brand-200 text-sm font-medium text-brand-700 active:bg-brand-50"
                >1 day</button>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="date" 
                    value={disposeState.date}
                    onChange={(e) => setDisposeState(prev => ({ ...prev, date: e.target.value }))}
                    onClick={(e) => {
                      if ('showPicker' in e.currentTarget) {
                        try { e.currentTarget.showPicker(); } catch (err) {}
                      }
                    }}
                    className="w-full appearance-none px-4 py-3 rounded-xl border border-brand-200 bg-white text-brand-900 font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[48px]" 
                  />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="time" 
                    value={disposeState.time}
                    onChange={(e) => setDisposeState(prev => ({ ...prev, time: e.target.value }))}
                    onClick={(e) => {
                      if ('showPicker' in e.currentTarget) {
                        try { e.currentTarget.showPicker(); } catch (err) {}
                      }
                    }}
                    className="w-full appearance-none px-4 py-3 rounded-xl border border-brand-200 bg-white text-brand-900 font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[48px]"
                  />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400 pointer-events-none" />
                </div>
              </div>
            </div>



            <div>
              <p className="text-sm font-bold text-brand-900 mb-3">Deal Amount</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-semibold">₹</span>
                <input 
                  type="number" 
                  className="w-full appearance-none pl-10 pr-4 py-3 rounded-xl border border-brand-200 bg-white text-brand-900 font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[48px]"
                  placeholder="Enter deal amount..."
                  value={dealAmount}
                  onChange={(e) => setDealAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-brand-900 mb-3">Dispose Remark</p>
              <div className="space-y-3">
                <textarea 
                  className="w-full h-32 rounded-xl border border-brand-200 bg-white p-4 focus:outline-none focus:border-brand-500 resize-none"
                  placeholder="Enter remarks..."
                  value={disposeRemark}
                  onChange={(e) => setDisposeRemark(e.target.value)}
                ></textarea>
                
                {/* File Upload Area */}
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {!selectedFile ? (
                    previousAttachment ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-white">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="h-4 w-4 text-brand-500 flex-shrink-0" />
                            <a href={previousAttachment.url || "#"} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-900 truncate hover:underline">
                              {previousAttachment.name} (Previously attached)
                            </a>
                          </div>
                          <button 
                            onClick={() => setPreviousAttachment(null)}
                            className="p-1 rounded-full hover:bg-red-50 text-brand-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <label 
                          htmlFor="file-upload" 
                          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-brand-300 bg-brand-50 text-brand-600 font-medium cursor-pointer hover:bg-brand-100 transition-colors text-sm"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>Attach New File</span>
                        </label>
                      </div>
                    ) : (
                      <label 
                        htmlFor="file-upload" 
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-brand-300 bg-brand-50 text-brand-600 font-medium cursor-pointer hover:bg-brand-100 transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span>Attach File (PDF, PNG, JPG)</span>
                      </label>
                    )
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-white">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="h-4 w-4 text-brand-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-brand-900 truncate">{selectedFile.name}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="p-1 rounded-full hover:bg-red-50 text-brand-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "OTHER" && (
          <div className="p-4 space-y-4">
             <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
              <div className="bg-brand-50 px-4 py-3 border-b border-brand-100 text-sm font-bold text-brand-900">
                Change Pipeline Stage
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-brand-600">Current Stage: <strong>{lead.currentStage.name}</strong></p>
                <div className="relative">
                  <select
                    className="w-full appearance-none px-4 py-3 rounded-xl border border-brand-200 bg-white text-brand-900 font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    value={newStageId}
                    onChange={(e) => setNewStageId(e.target.value)}
                  >
                    <option value="" disabled>Select New Stage</option>
                    {lead.campaign?.pipeline?.stages?.map((stage: any) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400 pointer-events-none" />
                </div>
              </div>
             </div>
             
             <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 h-14 rounded-xl border-brand-300 text-brand-700 font-semibold" onClick={() => setActiveTab("LEAD_INFO")}>
                Go Back
              </Button>
              <Button 
                onClick={handleCombinedSubmit}
                disabled={isDisposing || isUpdatingStage}
                className="flex-1 h-14 rounded-xl bg-brand-800 text-white shadow-md font-semibold disabled:opacity-50"
              >
                {isDisposing || isUpdatingStage ? "Submitting..." : "Submit"}
              </Button>
             </div>
          </div>
        )}
      </div>

      {/* Floating Call Button for LEAD_INFO tab */}
      {activeTab === "LEAD_INFO" && (
        <div className="absolute bottom-[80px] left-4 right-4 z-10">
          {lead.mobile ? (
            <a 
              href={`tel:${lead.mobile}`}
              className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg text-lg font-semibold flex items-center justify-center gap-2"
            >
              <Phone className="h-5 w-5 fill-white" />
              Call Now
            </a>
          ) : (
            <Button 
              className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg text-lg font-semibold flex items-center gap-2"
              onClick={handleCall}
            >
              <Phone className="h-5 w-5 fill-white" />
              Call Now
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
