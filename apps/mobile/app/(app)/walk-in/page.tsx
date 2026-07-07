"use client";

import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { leads as leadsApi, campaigns as campaignsApi, pipelines as pipelinesApi, type Campaign, type Pipeline, type PipelineStage } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WalkInPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    budgetMin: "",
    budgetMax: "",
    campaignId: "",
    currentStageId: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [campaignsData, pipelinesData] = await Promise.all([
          campaignsApi.list({ status: "ACTIVE" }),
          pipelinesApi.list()
        ]);
        
        setCampaigns(campaignsData);
        setPipelines(pipelinesData);
        
        if (campaignsData.length > 0) {
          const firstCampaign = campaignsData[0];
          const firstPipeline = pipelinesData.find(p => p.id === firstCampaign.pipelineId);
          
          setFormData(prev => ({
            ...prev,
            campaignId: firstCampaign.id,
            currentStageId: firstPipeline?.stages[0]?.id || "",
          }));
        }
      } catch (error) {
        toast.error("Failed to load campaigns");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.mobile) {
      toast.error("First Name and Mobile number are required");
      return;
    }
    
    if (!formData.campaignId || !formData.currentStageId) {
      toast.error("Please select a Campaign and Stage");
      return;
    }

    setIsSubmitting(true);
    try {
      await leadsApi.create({
        ...formData,
        leadType: "BUYER",
        budgetMin: formData.budgetMin ? parseInt(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? parseInt(formData.budgetMax) : undefined,
      });
      toast.success("Walk-in lead created successfully!");
      router.push("/leads");
    } catch (error: any) {
      toast.error(error.message || "Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === formData.campaignId);
  const selectedPipeline = pipelines.find(p => p.id === selectedCampaign?.pipelineId);

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="Add Walk-in Lead" />

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-100 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">First Name *</label>
                <Input 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  className="h-12 border-brand-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Last Name</label>
                <Input 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  className="h-12 border-brand-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Mobile Number *</label>
                <Input 
                  name="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  className="h-12 border-brand-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Email</label>
                <Input 
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="h-12 border-brand-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Min Budget</label>
                  <Input 
                    name="budgetMin"
                    type="number"
                    value={formData.budgetMin}
                    onChange={handleChange}
                    placeholder="₹ 0"
                    className="h-12 border-brand-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Max Budget</label>
                  <Input 
                    name="budgetMax"
                    type="number"
                    value={formData.budgetMax}
                    onChange={handleChange}
                    placeholder="₹ 0"
                    className="h-12 border-brand-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Campaign *</label>
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
                  >
                    <SelectTrigger className="h-12 border-brand-200">
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
                <div>
                  <label className="text-xs font-bold text-brand-600 uppercase mb-1 block">Stage *</label>
                  <Select
                    value={formData.currentStageId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currentStageId: value })
                    }
                    disabled={!selectedPipeline}
                  >
                    <SelectTrigger className="h-12 border-brand-200">
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

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-6 h-14 rounded-xl bg-brand-800 hover:bg-brand-900 text-white shadow-md text-lg font-semibold"
              >
                {isSubmitting ? "Saving..." : "Save Lead"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
