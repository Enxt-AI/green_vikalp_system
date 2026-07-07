"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile/header";
import { pipelinesApi, type PipelineStage } from "@/lib/api";
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

export default function LeadsCategoriesPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStages() {
      try {
        const pipelines = await pipelinesApi.list();
        // Extract all stages from all pipelines and deduplicate by name to keep the UI clean
        const allStages: PipelineStage[] = [];
        const seenNames = new Set<string>();
        
        pipelines.forEach(p => {
          p.stages.forEach(s => {
            if (!seenNames.has(s.name.toLowerCase())) {
              seenNames.add(s.name.toLowerCase());
              allStages.push(s);
            }
          });
        });
        
        setStages(allStages);
      } catch (error) {
        toast.error("Failed to fetch pipeline stages");
      } finally {
        setIsLoading(false);
      }
    }
    loadStages();
  }, []);

  const customCategories = [
    {
      title: "Follow-up",
      description: "Leads scheduled to be called later",
      href: "/categories/follow-up",
    }
  ];

  return (
    <div className="min-h-full bg-neutral-50/50 flex flex-col">
      <MobileHeader title="My Leads" />

      <div className="flex-1 p-5 pt-6 space-y-4 pb-[80px]">
        {/* Refresh indicator */}
        <div className="flex items-center justify-center gap-2 text-neutral-400 font-medium text-sm mb-6">
          <Check className="h-4 w-4" />
          <span>Refresh completed</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom Categories */}
            {customCategories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className="group flex items-center justify-between rounded-2xl bg-white p-5 text-neutral-900 shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 active:scale-[0.99] active:bg-neutral-50 transition-all"
              >
                <div className="pr-4">
                  <h3 className="text-lg font-semibold tracking-tight">{cat.title}</h3>
                  <p className="text-sm font-medium text-neutral-500 mt-1 opacity-90 line-clamp-1">{cat.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 transition-colors shrink-0" strokeWidth={2.5} />
              </Link>
            ))}

            {/* Pipeline Stages */}
            {stages.map((stage) => (
              <Link
                key={stage.id}
                href={`/categories/stage-${stage.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white p-5 text-neutral-900 shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 active:scale-[0.99] active:bg-neutral-50 transition-all"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#3B82F6' }} />
                    <h3 className="text-lg font-semibold tracking-tight">{stage.name}</h3>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 mt-1 opacity-90 line-clamp-1">{stage.description || `Leads in ${stage.name} stage`}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 transition-colors shrink-0" strokeWidth={2.5} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
