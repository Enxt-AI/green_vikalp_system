"use client";

import { ImportLeadsDialog } from "@/components/import-leads-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadIcon, FileSpreadsheetIcon } from "lucide-react";
import Link from "next/link";

export default function ExcelIntegrationPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Excel / CSV File Upload</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload bulk leads directly into a Campaign from an Excel (.xlsx) or CSV file with custom schema mapping.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Import leads with custom column mapping. Map any column to standard fields or create custom fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportLeadsDialog>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <UploadIcon className="w-4 h-4 mr-2" />
                Import Leads from CSV/Excel
              </Button>
            </ImportLeadsDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>What you can do with the importer</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <FileSpreadsheetIcon className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                <span>Auto-detect column mappings (First Name, Email, Mobile, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <FileSpreadsheetIcon className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                <span>Custom field mapping - store any column as custom data</span>
              </li>
              <li className="flex items-start gap-2">
                <FileSpreadsheetIcon className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                <span>Transform values (uppercase, lowercase, parse numbers)</span>
              </li>
              <li className="flex items-start gap-2">
                <FileSpreadsheetIcon className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                <span>Duplicate detection by email or mobile</span>
              </li>
              <li className="flex items-start gap-2">
                <FileSpreadsheetIcon className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                <span>Auto-assign leads to team members</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Supported Standard Fields</CardTitle>
            <CardDescription>Your file can include these column headers for automatic mapping:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="font-medium text-neutral-900">Personal Info</p>
                <ul className="text-sm text-neutral-600 space-y-0.5">
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">First Name</code> - Required</li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Last Name</code> - Required</li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Email</code> - Required*</li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Mobile</code> - Required*</li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Alternate Phone</code></li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-neutral-900">Property Preferences</p>
                <ul className="text-sm text-neutral-600 space-y-0.5">
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Lead Type</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Budget Min</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Budget Max</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Location</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Bedrooms</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Bathrooms</code></li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-neutral-900">Additional</p>
                <ul className="text-sm text-neutral-600 space-y-0.5">
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Tags</code> (comma-separated)</li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Notes</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Move-in Timeline</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Housing Status</code></li>
                  <li><code className="text-xs bg-neutral-100 px-1 rounded">Pre-Approval Status</code></li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-4">
              * Either Email or Mobile is required. Any column not in this list will be stored as a custom field.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
