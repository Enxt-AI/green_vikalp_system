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

/** Mobile card rows mirroring the rounded-2xl list cards. */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200/60 bg-white p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Label + input row placeholders for forms and dialogs. */
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Stacked title + body placeholders for detail pages. */
export function DetailSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200/60 bg-white p-5">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200/60 bg-white p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Centered loader replacement for full-screen auth gates. */
export function ScreenSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6">
      <Skeleton className="h-12 w-12 rounded-2xl" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
