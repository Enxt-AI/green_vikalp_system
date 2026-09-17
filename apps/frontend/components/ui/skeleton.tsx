import { cn } from "@/lib/utils";

/** Base pulse block. Compose with width/height classes at the call site. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
    />
  );
}

/** Stat-card row (dashboard / leads headers). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Table with header + body row placeholders. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex gap-4 border-b border-neutral-100 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="space-y-3 pt-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Label + input row placeholders for dialogs and forms. */
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Month-grid placeholder for the meetings calendar. */
export function CalendarSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Stacked title + body placeholders for detail pages and dialogs. */
export function DetailSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Kanban column placeholders for the campaign pipeline view. */
export function KanbanSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
          <Skeleton className="h-5 w-28" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
