import type { Match } from "@/lib/league";

/** Pulsing red LIVE badge with the current leg scoreline. */
export function LiveBadge({ match }: { match: Pick<Match, "live_a" | "live_b"> }) {
  const has = match.live_a != null && match.live_b != null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-2 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-destructive-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
      </span>
      Live{has && <span className="tabular-nums">{match.live_a} – {match.live_b}</span>}
    </span>
  );
}
