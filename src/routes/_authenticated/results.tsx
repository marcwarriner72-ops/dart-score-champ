import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { DartLoader } from "@/components/DartLoader";
import {
  formatDate,
  hasStarted,
  predictionPoints,
  useMatches,
  useProfiles,
  useSession,
  useVisiblePredictions,
  type Match,
  type Prediction,
} from "@/lib/league";

export const Route = createFileRoute("/_authenticated/results")({
  component: ResultsPage,
  head: () => ({
    meta: [
      { title: "Results & Archive | Darts Predictor League" },
      {
        name: "description",
        content:
          "See everyone's darts predictions once a match starts, plus the full archive of completed fixtures and points scored.",
      },
      { property: "og:title", content: "Results & Archive | Darts Predictor League" },
      {
        property: "og:description",
        content: "Everyone's picks revealed at throw-off, with a full archive of finished matches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResultsPage() {
  const { data: user } = useSession();
  const { data: matches = [], isLoading } = useMatches();
  const { data: predictions = [] } = useVisiblePredictions();
  const { data: profiles = [] } = useProfiles();

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, p.display_name);
    return map;
  }, [profiles]);

  const inPlay = matches.filter((m) => m.status !== "finished" && hasStarted(m));
  const archive = matches
    .filter((m) => m.status === "finished")
    .slice()
    .reverse();

  if (isLoading) {
    return (
      <AppShell title="Results" subtitle="Picks revealed at throw-off">
        <DartLoader label="Counting the scores…" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Results" subtitle="Picks revealed at throw-off">
      <h2 className="font-display text-xl font-bold uppercase">In play</h2>
      <div className="mt-2 space-y-3">
        {inPlay.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on the oche right now.</p>
        ) : (
          inPlay.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              predictions={predictions.filter((p) => p.match_id === m.id)}
              names={names}
              meId={user?.id}
            />
          ))
        )}
      </div>

      <h2 className="mt-6 font-display text-xl font-bold uppercase">Archive</h2>
      <div className="mt-2 space-y-3">
        {archive.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed matches yet.</p>
        ) : (
          archive.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              predictions={predictions.filter((p) => p.match_id === m.id)}
              names={names}
              meId={user?.id}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function MatchCard({
  match,
  predictions,
  names,
  meId,
}: {
  match: Match;
  predictions: Prediction[];
  names: Map<string, string>;
  meId: string | undefined;
}) {
  const finished = match.status === "finished";
  const rows = predictions
    .map((p) => ({ p, pts: predictionPoints(match, p) ?? 0 }))
    .sort((x, y) => y.pts - x.pts);

  return (
    <section className="panel p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {match.tournament || "Match"}
          </p>
          <p className="truncate font-display text-lg font-bold uppercase">
            {match.player_a} <span className="text-accent">vs</span> {match.player_b}
          </p>
          <p className="text-xs text-muted-foreground">{formatDate(match.starts_at)}</p>
        </div>
        <span className="shrink-0 font-display text-2xl font-bold">
          {finished ? `${match.score_a}–${match.score_b}` : "LIVE"}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {rows.length === 0 ? (
          <li className="text-sm text-muted-foreground">No predictions were made.</li>
        ) : (
          rows.map(({ p, pts }) => (
            <li
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm"
            >
              <span className="truncate font-semibold">
                {p.user_id === meId ? "You" : (names.get(p.user_id) ?? "Player")}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {p.predicted_winner === "a" ? match.player_a : match.player_b} · {p.score_a}–
                {p.score_b}
              </span>
              {finished && (
                <span
                  className={`shrink-0 font-display text-lg font-bold ${
                    pts === 3 ? "text-gold" : pts === 1 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {pts}
                </span>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
