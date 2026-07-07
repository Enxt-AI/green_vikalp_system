"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { auth, integrations } from "@/lib/api";

export default function GoogleDrivePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const statusData = await integrations.getGoogleDriveStatus();
        setIsConnected(statusData.connected);
        if (statusData.error) {
          setErrorMessage(statusData.error);
        } else {
          setErrorMessage(null);
        }

        if (statusData.connected) {
          setIsConnected(true);

          if (statusData.defaultFolderId) {
            setSelectedFolder(statusData.defaultFolderId);
          }

          try {
            const driveData = await integrations.getGoogleDriveFolders();
            if (driveData.folders) {
              setFolders(driveData.folders);
            }
          } catch (e) {
            // Folders might fail if API is disabled or scopes missing, despite statusData.connected being true from other checks
            toast.error("Could not fetch folders. Please verify Google Drive API is enabled and reconnect.");
            setIsConnected(false);
          }
        }
      } catch (error) {
        toast.error("Failed to fetch Google Drive status");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleConnect() {
    setIsLoading(true);
    try {
      // Pass returnTo parameter so the OAuth callback redirects back to this page
      const data = await auth.getGoogleAuthUrl("/dashboard/integrations/google/drive");
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

  async function handleSave() {
    setIsLoading(true);
    try {
      const data = await integrations.saveGoogleDriveConfig(selectedFolder);
      toast.success(data.message || "Google Drive configuration saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Error saving configuration");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Google Drive Integration</h1>
        <p className="mt-1 text-sm text-neutral-500">Connect Google Drive to store and sync your CRM documents.</p>
      </div>

      {isConnected === null ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-neutral-500">Checking connection status...</p>
        </div>
      ) : isConnected === false ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto w-full">
            <CardHeader className="flex flex-col items-center justify-center text-center space-y-4 w-full">
              <CardTitle className="text-2xl font-bold text-center">Not Connected</CardTitle>
              <CardDescription className="text-center px-4 w-full">Your Google account is not connected for Drive integration</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-6 w-full mt-4">
              <p className="text-sm text-neutral-500 text-center leading-relaxed w-full">
                To sync documents, you need to authorize access to your Google Drive.
              </p>
              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm w-full text-center">
                  <p className="font-semibold">Connection Error:</p>
                  <p>{errorMessage}</p>
                </div>
              )}
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle>Folder Configuration</CardTitle>
                <CardDescription>Select a default Google Drive folder for document sync</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={isLoading}>
                {isLoading ? "Connecting..." : "Reconnect Account"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Sync Folder</Label>
                {folders.length > 0 ? (
                  <>
                    <Select onValueChange={setSelectedFolder} value={selectedFolder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Drive Folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <div
                          className="p-2 sticky top-0 bg-white z-10 border-b"
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            placeholder="Search folders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        {filteredFolders.length > 0 ? (
                          filteredFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)
                        ) : (
                          <div className="p-2 text-sm text-neutral-500 text-center">No folders match your search</div>
                        )}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <div className="text-sm text-neutral-500 p-2 border rounded bg-neutral-50">
                    No folders found in your Google Drive. Please create one and refresh the page.
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex justify-end">
              <Button
                className="bg-neutral-900 hover:bg-neutral-800"
                onClick={handleSave}
                disabled={isLoading || !selectedFolder}
              >
                {isLoading ? "Saving..." : "Save Configuration"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
