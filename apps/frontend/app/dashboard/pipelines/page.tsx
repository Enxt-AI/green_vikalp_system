"use client";

import { useRouter } from "next/navigation";
import { CACHE_TTLS, invalidateCache, useCachedFetch } from "@/lib/cached-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pipelines as pipelinesApi, type Pipeline, type PipelineStage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CreatePipelineDialog } from "@/components/create-pipeline-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function PipelinesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: pipelinesData, loading, refresh: refreshPipelines } = useCachedFetch<Pipeline[]>(
    "pipelines:all",
    () => pipelinesApi.list().catch((error: any) => {
      toast.error(error.message || "Failed to load pipelines");
      throw error;
    }),
    { ttl: CACHE_TTLS.reference }
  );
  const pipelines = pipelinesData ?? [];

  async function loadPipelines() {
    invalidateCache("pipelines:");
    await refreshPipelines();
  }

  const handleDeletePipeline = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this pipeline?")) return;
    try {
      await pipelinesApi.delete(id);
      toast.success("Pipeline deleted successfully");
      loadPipelines();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete pipeline");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="mt-2 h-4 w-80" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Pipelines</h1>
          <p className="text-neutral-600 mt-1">Manage sales pipelines and stages</p>
        </div>
        {user && (user.role === "ADMIN" || user.role === "MANAGER") && (
          <CreatePipelineDialog onPipelineCreated={loadPipelines}>
            <Button>Create Pipeline</Button>
          </CreatePipelineDialog>
        )}
      </div>

      <div className="grid gap-6">
        {pipelines.map((pipeline) => (
          <Card 
            key={pipeline.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/dashboard/campaigns?pipelineId=${pipeline.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    {pipeline.name}
                    <Badge variant="outline" className="font-normal">
                      {pipeline.type}
                    </Badge>
                    {pipeline._count && (
                      <Badge variant="secondary" className="font-normal">
                        {pipeline._count.campaigns} campaigns
                      </Badge>
                    )}
                  </CardTitle>
                  {pipeline.description && (
                    <p className="text-sm text-neutral-600 mt-1">
                      {pipeline.description}
                    </p>
                  )}
                </div>
                {user && (user.role === "ADMIN" || user.role === "MANAGER") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-1 shrink-0"
                    onClick={(e) => handleDeletePipeline(e, pipeline.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">Stages:</p>
                <div className="flex flex-wrap gap-2">
                  {pipeline.stages.map((stage) => (
                    <Badge
                      key={stage.id}
                      className="px-3 py-1"
                      style={{
                        backgroundColor: stage.color + "20",
                        color: stage.color,
                        borderColor: stage.color,
                      }}
                    >
                      {stage.order + 1}. {stage.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pipelines.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-neutral-600 mb-4">No pipelines found</p>
              <p className="text-sm text-neutral-500">Contact your administrator to create pipelines</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
