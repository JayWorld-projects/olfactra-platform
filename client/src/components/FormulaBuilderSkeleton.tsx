import { Skeleton } from "./ui/skeleton";

/**
 * Layout-matched loading skeleton for the Formula Builder page.
 * Mirrors the actual structure: header → stat cards → tab bar → ingredient table.
 * Uses a calm, slow pulse — no flashy shimmer.
 */
export function FormulaBuilderSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header: back arrow + title + description */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <Skeleton className="h-7 w-56 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-[80%] max-w-lg rounded-md ml-11" />
        </div>
        {/* Toolbar buttons */}
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Stat cards row: 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Ingredient table */}
      <div className="rounded-xl border border-border/50 bg-card">
        {/* Table header */}
        <div className="border-b border-border/40 px-4 py-3 flex gap-6">
          <Skeleton className="h-3 w-36 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border/20 last:border-0 px-4 py-3.5 flex items-center gap-6"
          >
            <div className="flex items-center gap-2 w-36">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
