"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { campaigns as campaignsApi, type Campaign } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CreateCampaignDialog } from "@/components/create-campaign-dialog";
import { toast } from "sonner";

const STATUS_STYLES = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-neutral-100 text-neutral-700",
};

export default function CampaignsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelineId = searchParams.get("pipelineId");
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, [pipelineId]);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const params = pipelineId ? { pipelineId } : undefined;
      const data = await campaignsApi.list(params);
      setCampaigns(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;
    try {
      await campaignsApi.delete(id);
      toast.success("Campaign deleted successfully");
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete campaign");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-neutral-900">Campaigns</h1>
            {pipelineId && campaigns.length > 0 && (
              <Badge variant="outline" className="text-sm">
                Pipeline: {campaigns[0]?.pipeline?.name}
              </Badge>
            )}
          </div>
          <p className="text-neutral-600 mt-1">
            {pipelineId ? "Campaigns filtered by pipeline" : "Marketing campaigns and lead generation"}
          </p>
          {pipelineId && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm mt-1"
              onClick={() => router.push("/dashboard/campaigns")}
            >
              ← View all campaigns
            </Button>
          )}
        </div>
        {user && (user.role === "ADMIN" || user.role === "MANAGER") && (
          <CreateCampaignDialog onCampaignCreated={loadCampaigns}>
            <Button>Create Campaign</Button>
          </CreateCampaignDialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900">
              {campaigns.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {campaigns.filter((c) => c.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900">
              {campaigns.reduce((sum, c) => sum + (c._count?.leads || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-neutral-600 mb-4">No campaigns found</p>
              <p className="text-sm text-neutral-500">
                Contact your manager to create campaigns
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow 
                      key={campaign.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                    >
                      <TableCell className="font-medium">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[campaign.status]}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {campaign.source.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {campaign.pipeline.name}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {campaign._count?.leads || 0}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(campaign.budget)}</TableCell>
                      <TableCell>
                        {formatCurrency(campaign.actualSpend)}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {formatDate(campaign.startDate)}
                        {campaign.endDate && ` - ${formatDate(campaign.endDate)}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.assignedTo && campaign.assignedTo.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {campaign.assignedTo.slice(0, 2).map((user) => (
                              <Badge
                                key={user.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {user.fullName.split(" ")[0]}
                              </Badge>
                            ))}
                            {campaign.assignedTo.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{campaign.assignedTo.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/dashboard/campaigns/${campaign.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </Link>
                          {user && (user.role === "ADMIN") && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDelete(e, campaign.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
