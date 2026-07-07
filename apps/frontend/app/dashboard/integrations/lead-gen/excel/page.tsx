"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { pipelines, campaigns, integrations } from "@/lib/api";
import { UploadIcon, FileSpreadsheetIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

export default function ExcelIntegrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [campaignsList, setCampaignsList] = useState<{ id: string; name: string }[]>([]);
  const [stagesList, setStagesList] = useState<{ id: string; name: string }[]>([]);

  const [config, setConfig] = useState({
    campaignId: "",
    currentStageId: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    errors: { row: number; error: string }[];
  } | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!config.campaignId || !config.currentStageId) {
      toast.error("Please select a Campaign and Stage first.");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select an Excel or CSV file to upload.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("campaignId", config.campaignId);
      formData.append("stageId", config.currentStageId);
      formData.append("file", selectedFile);

      const response = await integrations.uploadExcelLeads(formData);

      setResult({
        imported: response.imported,
        updated: response.updated,
        errors: response.errors || [],
      });

      toast.success(response.message || "File uploaded successfully!");

      // Reset file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to upload and process file.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Excel / CSV File Upload</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload bulk leads directly into a Campaign from an Excel (.xlsx) or CSV file.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Configuration</CardTitle>
            <CardDescription>Select where the imported leads should be placed.</CardDescription>
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
            <CardTitle>2. Upload File</CardTitle>
            <CardDescription>Select your .xlsx or .csv file to process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 rounded-lg hover:border-neutral-400 transition-colors cursor-pointer bg-neutral-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheetIcon className="h-10 w-10 text-neutral-400 mb-2" />
              <p className="text-sm font-medium text-neutral-700">
                {selectedFile ? selectedFile.name : "Click to select file"}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Supports .xlsx and .csv</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={isLoading || !selectedFile || !config.campaignId || !config.currentStageId}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              {isLoading ? "Processing..." : "Upload & Import Leads"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="lg:col-span-2 border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center">
                <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8 mb-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm flex-1">
                  <p className="text-sm text-neutral-500">Newly Created</p>
                  <p className="text-2xl font-bold text-neutral-900">{result.imported}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex-1">
                  <p className="text-sm text-neutral-500">Updated/Merged</p>
                  <p className="text-2xl font-bold text-neutral-900">{result.updated}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex-1">
                  <p className="text-sm text-neutral-500">Failed Rows</p>
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4 bg-white border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                    <XCircleIcon className="w-4 h-4 mr-2" /> Error Details
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>3. Expected File Format</CardTitle>
            <CardDescription>Your file must include specific column headers to be processed correctly.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-neutral-600 space-y-4">
              <p>
                Please ensure your Excel or CSV file includes a header row with the following exact column names:
              </p>

              <div className="bg-neutral-900 text-neutral-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="pb-2 font-semibold">Column Name</th>
                      <th className="pb-2 font-semibold">Requirement</th>
                      <th className="pb-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>First Name</code></td>
                      <td className="py-2 text-yellow-500">Required</td>
                      <td className="py-2">The lead's first name.</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>Email</code></td>
                      <td className="py-2 text-yellow-500">Required*</td>
                      <td className="py-2">Lead email address. (*Either Email or Mobile is required)</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>Mobile</code></td>
                      <td className="py-2 text-yellow-500">Required*</td>
                      <td className="py-2">Lead phone number. (*Either Email or Mobile is required)</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>Last Name</code></td>
                      <td className="py-2 text-neutral-400">Optional</td>
                      <td className="py-2">The lead's last name.</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>Alternate Phone</code></td>
                      <td className="py-2 text-neutral-400">Optional</td>
                      <td className="py-2">A secondary contact number.</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>Lead Type</code></td>
                      <td className="py-2 text-neutral-400">Optional</td>
                      <td className="py-2">Must be: BUYER, SELLER, INVESTOR, or RENTER.</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-2"><code>Budget Min</code></td>
                      <td className="py-2 text-neutral-400">Optional</td>
                      <td className="py-2">Numeric value (e.g. 50000)</td>
                    </tr>
                    <tr>
                      <td className="py-2"><code>Budget Max</code></td>
                      <td className="py-2 text-neutral-400">Optional</td>
                      <td className="py-2">Numeric value (e.g. 100000)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Note: The importer will automatically skip any rows that are missing the First Name or lack both an Email and Mobile number. It will intelligently update existing leads if a match is found based on Email or Mobile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
