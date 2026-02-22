import { Skeleton } from "./ui/skeleton";

/**
 * Layout-matched loading skeleton for the Library page.
 * Mirrors the actual structure: header → filters → ingredient card grid.
 * Uses the same calm, slow pulse as FormulaBuilderSkeleton.
 */
export function LibrarySkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header: title + buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Filter bar: search + category dropdown + favorites */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-[200px] rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Ingredient card grid: 6 cards in 3-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
          >
            {/* Card header: name + category badge */}
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            {/* CAS number */}
            <Skeleton className="h-3 w-28 rounded" />
            {/* Metadata row: supplier, stock, cost */}
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
            {/* Badges: longevity + IFRA */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
