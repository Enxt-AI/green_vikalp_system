"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { auth, pipelines, campaigns, integrations } from "@/lib/api";

const LEAD_FIELDS = [
  { id: "firstName", label: "First Name", required: true },
  { id: "lastName", label: "Last Name" },
  { id: "email", label: "Email (Required if no mobile)" },
  { id: "mobile", label: "Mobile (Required if no email)" },
  { id: "alternatePhone", label: "Alternate Phone" },
  { id: "leadType", label: "Lead Type" },
  { id: "budgetMin", label: "Budget Min" },
  { id: "budgetMax", label: "Budget Max" },
];

export default function GoogleSheetsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [campaignsList, setCampaignsList] = useState<{ id: string; name: string }[]>([]);
  const [pipelinesList, setPipelinesList] = useState<{ id: string; name: string; stages: any[] }[]>([]);
  const [stagesList, setStagesList] = useState<{ id: string; name: string }[]>([]);

  const [config, setConfig] = useState({
    googleSheetsUrl: "",
    range: "A1:Z1000",
    campaignId: "",
    currentStageId: "",
    mapping: {} as Record<string, string>,
  });

  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // Check connection status
        const statusData = await integrations.getGoogleSheetsStatus();
        setIsConnected(statusData.connected);
        if (statusData.defaultSheetsUrl) {
          setConfig(prev => ({ ...prev, googleSheetsUrl: statusData.defaultSheetsUrl! }));
        }

        // Load dependencies
        const [camps, pipes] = await Promise.all([
          campaigns.list(),
          pipelines.list(),
        ]);
        setCampaignsList(camps.map(c => ({ id: c.id, name: c.name })));
        setPipelinesList(pipes.map(p => ({ id: p.id, name: p.name, stages: p.stages })));
      } catch (error) {
        toast.error("Failed to initialize integration page");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function handleConnect() {
    setIsLoading(true);
    try {
      const data = await auth.getGoogleAuthUrl();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (error) {
      toast.error("Failed to initiate connection");
      setIsLoading(false);
    }
  }

  async function handleCampaignChange(campaignId: string) {
    setConfig(prev => ({ ...prev, campaignId }));

    // Find the pipeline for this campaign to get its stages
    const camp = campaignsList.find(c => c.id === campaignId);
    // Note: In real API, campaigns.get(campaignId) would give us pipelineId
    // For now, let's assume we might need to fetch the campaign details
    try {
      const details = await campaigns.get(campaignId);
      const pipeline = await pipelines.get(details.pipelineId);
      setStagesList(pipeline.stages.map(s => ({ id: s.id, name: s.name })));
    } catch (error) {
      toast.error("Failed to load stages for selected campaign");
    }
  }

  function extractSpreadsheetId(url: string) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url; // fallback to assuming they entered the ID directly
  }

  async function fetchHeaders() {
    setIsLoading(true);
    try {
      const spreadsheetId = extractSpreadsheetId(config.googleSheetsUrl);
      if (!spreadsheetId) throw new Error("Invalid Google Sheets URL");

      const data = await integrations.getGoogleSheetsHeaders(spreadsheetId, config.range);
      if (data.headers) {
        setHeaders(data.headers);
        toast.success("Headers fetched successfully!");

        // Save the URL as default
        try {
          await integrations.saveGoogleSheetsConfig(config.googleSheetsUrl);
        } catch (err) {
          console.error("Failed to save default Sheets URL", err);
        }
      } else {
        throw new Error("Failed to fetch headers");
      }
    } catch (error: any) {
      toast.error(error.message || "Error fetching headers");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    setIsLoading(true);
    try {
      const spreadsheetId = extractSpreadsheetId(config.googleSheetsUrl);
      if (!spreadsheetId) throw new Error("Invalid Google Sheets URL");

      const data = await integrations.syncGoogleSheets({ ...config, spreadsheetId });
      toast.success(`Sync complete: ${data.imported} imported, ${data.updated} updated`);
    } catch (error: any) {
      toast.error(error.message || "Error during sync");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Google Sheets Integration</h1>
        <p className="mt-1 text-sm text-neutral-500">Connect your Google Sheet to automatically import leads.</p>
      </div>

      {isConnected === false ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto w-full">
            <CardHeader className="flex flex-col items-center justify-center text-center space-y-4 w-full">
              <CardTitle className="text-2xl font-bold text-center">Not Connected</CardTitle>
              <CardDescription className="text-center px-4 w-full">Your Google account is not connected for Sheets integration</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-6 w-full mt-4">
              <p className="text-sm text-neutral-500 text-center leading-relaxed w-full">
                To import leads from Google Sheets, you need to authorize access to your Google Sheets and Drive accounts.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center w-full mt-6">
              <Button
                className="bg-green-600 hover:bg-green-700 px-8"
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? "Connecting..." : "Connect Google Account"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>Enter your sheet details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Google Sheets URL</Label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={config.googleSheetsUrl}
                  onChange={e => setConfig(prev => ({ ...prev, googleSheetsUrl: e.target.value }))}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  disabled={!config.googleSheetsUrl || isLoading}
                  onClick={async () => {
                    try {
                      await integrations.saveGoogleSheetsConfig(config.googleSheetsUrl);
                      toast.success("Saved as default Google Sheets URL");
                    } catch (error) {
                      toast.error("Failed to save default URL");
                    }
                  }}
                >
                  Save as Default
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Target Campaign</Label>
                <Select onValueChange={handleCampaignChange} value={config.campaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignsList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                    {stagesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={fetchHeaders}
                disabled={isLoading || !config.googleSheetsUrl}
              >
                {isLoading ? "Loading..." : "Fetch Column Headers"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>Map sheet columns to Lead fields</CardDescription>
            </CardHeader>
            <CardContent>
              {headers.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-center text-neutral-500">
                  Fetch headers first to start mapping columns.
                </div>
              ) : (
                <div className="grid gap-4">
                  {LEAD_FIELDS.map(field => (
                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                      <Label className="text-sm font-medium text-neutral-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Select
                        value={config.mapping[field.id] || ""}
                        onValueChange={v => setConfig(prev => ({ ...prev, mapping: { ...prev.mapping, [field.id]: v } }))}
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Select Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              {header} (Col {idx + 1})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t p-4 flex justify-end">
              <Button
                className="bg-neutral-900 hover:bg-neutral-800"
                onClick={handleSync}
                disabled={isLoading || headers.length === 0}
              >
                {isLoading ? "Syncing..." : "Sync Leads Now"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
