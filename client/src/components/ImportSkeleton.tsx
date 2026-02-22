import { Skeleton } from "./ui/skeleton";

/**
 * Layout-matched loading skeleton for the Import page.
 * Mirrors the actual structure: header → step indicator → input area with tabs.
 * Uses the same calm, slow pulse as other page skeletons.
 */
export function ImportSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header: title + subtitle */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Step indicator bar */}
      <div className="flex items-center gap-3 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3 w-16 rounded" />
            {i < 3 && <Skeleton className="h-px w-8 rounded" />}
          </div>
        ))}
      </div>

      {/* Main content card with input tabs */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
        {/* Tab bar: Paste / CSV / PDF */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>

        {/* Textarea placeholder */}
        <Skeleton className="h-40 w-full rounded-lg" />

        {/* Action button */}
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
