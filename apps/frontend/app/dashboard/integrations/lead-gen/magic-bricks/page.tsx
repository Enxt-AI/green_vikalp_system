"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { pipelines, campaigns } from "@/lib/api";
import { CopyIcon, CheckIcon } from "lucide-react";

export default function MagicBricksIntegrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [campaignsList, setCampaignsList] = useState<{ id: string; name: string }[]>([]);
  const [stagesList, setStagesList] = useState<{ id: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    campaignId: "",
    currentStageId: "",
  });

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const camps = await campaigns.list();
        setCampaignsList(camps.map(c => ({ id: c.id, name: c.name })));
      } catch (error) {
        toast.error("Failed to load campaigns");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function handleCampaignChange(campaignId: string) {
    setConfig(prev => ({ ...prev, campaignId, currentStageId: "" }));
    try {
      const details = await campaigns.get(campaignId);
      const pipeline = await pipelines.get(details.pipelineId);
      setStagesList(pipeline.stages.map(s => ({ id: s.id, name: s.name })));
    } catch (error) {
      toast.error("Failed to load stages for selected campaign");
    }
  }

  const generatedWebhookUrl =
    config.campaignId && config.currentStageId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/webhooks/pabbly/magic-bricks/${config.campaignId}/${config.currentStageId}`
      : "";

  const handleCopy = () => {
    if (generatedWebhookUrl) {
      navigator.clipboard.writeText(generatedWebhookUrl);
      setCopied(true);
      toast.success("Webhook URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Magicbricks Integration (via Pabbly Connect)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate a webhook URL to securely receive leads from Magicbricks through Pabbly Connect.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Configuration</CardTitle>
            <CardDescription>Select where incoming Magicbricks leads should be placed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Campaign</Label>
              <Select onValueChange={handleCampaignChange} value={config.campaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaignsList.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Stage</Label>
              <Select
                onValueChange={v => setConfig(prev => ({ ...prev, currentStageId: v }))}
                value={config.currentStageId}
                disabled={!config.campaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stagesList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Webhook URL</CardTitle>
            <CardDescription>Paste this URL into the "API by Pabbly" action in Pabbly Connect.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedWebhookUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-100 rounded-lg break-all font-mono text-sm border border-neutral-200">
                  {generatedWebhookUrl}
                </div>
                <Button onClick={handleCopy} className="w-full bg-green-600 hover:bg-green-700">
                  {copied ? <CheckIcon className="w-4 h-4 mr-2" /> : <CopyIcon className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Webhook URL"}
                </Button>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center border-2 border-dashed border-neutral-200 rounded-lg text-neutral-500 text-sm">
                Select a Campaign and Stage to generate your URL.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>3. Pabbly Connect Instructions</CardTitle>
            <CardDescription>How to map your Magicbricks fields to this CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-neutral-600 space-y-4">
              <p>
                In Pabbly Connect, create a new workflow with <strong>Magicbricks</strong> as the Trigger. Then, add an <strong>API by Pabbly</strong> Action and configure it as follows:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Action Event:</strong> Custom Request</li>
                <li><strong>Method:</strong> POST</li>
                <li><strong>API Endpoint URL:</strong> Paste the generated Webhook URL from above.</li>
                <li><strong>Data Type:</strong> JSON</li>
              </ul>

              <h3 className="text-neutral-900 font-semibold mt-6 mb-2">JSON Payload Mapping</h3>
              <p>
                Copy the following JSON structure into the <strong>Data</strong> field in Pabbly Connect. Replace the values (e.g., <code>Magicbricks First Name</code>) with the dynamic tags provided by the Magicbricks trigger:
              </p>

              <div className="bg-neutral-900 text-neutral-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`{
  "firstName": "Magicbricks First Name",
  "lastName": "Magicbricks Last Name",
  "email": "Magicbricks Email",
  "mobile": "Magicbricks Mobile",
  "leadType": "BUYER",
  "budgetMin": "Magicbricks Budget Min",
  "budgetMax": "Magicbricks Budget Max"
}`}</pre>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                * Note: <code>firstName</code> is strictly required. Either <code>email</code> or <code>mobile</code> must also be provided to prevent duplicates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
