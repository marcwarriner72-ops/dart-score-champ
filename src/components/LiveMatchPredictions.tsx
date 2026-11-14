import { useEffect, useState } from "react";
import { useMatches, useProfiles, useVisiblePredictions, matchFormatLabel } from "@/lib/league";

/** Matches that have thrown off but have no result yet, with everyone's picks. */
export function LiveMatchPredictions() {
  const { data: matches = [] } = useMatches();
  const { data: preds = [] } = useVisiblePredictions();
  const { data: profiles = [] } = useProfiles();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const live = matches
    .filter(
      (m) =>
        !m.archived &&
        new Date(m.starts_at).getTime() <= now &&
        (m.score_a === null || m.score_b === null),
    )
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  if (live.length === 0) return null;

  return (
    <div className="space-y-4">
      {live.map((m) => {
        const picks = preds.filter((p) => p.match_id === m.id);
        return (
          <section key={m.id} className="panel border-destructive/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
                Live now
              </span>
              <span className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.tournament} · {matchFormatLabel(m)}
              </span>
            </div>
            <p className="mt-2 truncate font-display text-lg font-bold uppercase">
              {m.player_a} <span className="text-accent">vs</span> {m.player_b}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Everyone's picks
            </p>
            {picks.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nobody predicted this one.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {picks.map((p) => {
                  const prof = profiles.find((x: { id: string }) => x.id === p.user_id) as
                    | { display_name?: string | null }
                    | undefined;
                  const winner = p.predicted_winner === "a" ? m.player_a : m.player_b;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-semibold">{prof?.display_name ?? "Player"}</span>
                      <span className="shrink-0 text-right text-xs tabular-nums">
                        <span className="font-bold text-primary">{winner.split(" ").slice(-1)[0]} {p.score_a}–{p.score_b}</span>
                        {p.guess_180s != null && <span className="ml-2 text-accent">{p.guess_180s}×180</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
