import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shaped like a fixture / prediction card. */
export function MatchCardSkeleton() {
  return (
    <div className="panel space-y-3 p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-3 w-32" />
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function MatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Placeholder shaped like a leaderboard / player row list. */
export function RowListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5"
        >
          <Skeleton className="size-5" />
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder shaped like chat bubbles. */
export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`flex gap-2 ${i % 2 ? "flex-row-reverse" : ""}`}>
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className={`h-10 ${i % 2 ? "w-40" : "w-52"} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}
