import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Trophy, ListChecks } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  formatDate,
  predictionPoints,
  useLeaderboard,
  useMatches,
  useMyPredictions,
  useSession,
} from "@/lib/league";
import { Button } from "@/components/ui/button";
import { NextFixtureCountdown } from "@/components/NextFixtureCountdown";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Your Dashboard | Darts Predictor League" },
      {
        name: "description",
        content:
          "See your points, league rank, open predictions and a live countdown to the next darts fixture.",
      },
      { property: "og:title", content: "Your Dashboard | Darts Predictor League" },
      {
        property: "og:description",
        content: "Points, rank and a countdown to the next darts fixture.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Dashboard() {
  const { data: user } = useSession();
  const { data: matches = [] } = useMatches();
  const { data: predictions = [] } = useMyPredictions(user?.id);
  const { data: board = [] } = useLeaderboard();

  const upcoming = matches.filter((m) => m.status === "upcoming");
  const finished = matches.filter((m) => m.status === "finished").slice(-5).reverse();
  const missing = upcoming.filter((m) => !predictions.some((p) => p.match_id === m.id));
  const me = board.find((r) => r.user_id === user?.id);
  const rank = me ? board.findIndex((r) => r.user_id === user?.id) + 1 : null;

  return (
    <AppShell title="Dashboard" subtitle="Your league at a glance">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Points" value={me?.points ?? 0} highlight />
        <Stat label="Rank" value={rank ? `#${rank}` : "—"} />
        <Stat label="Bullseyes" value={me?.exact_hits ?? 0} />
      </div>

      <div className="mt-4">
        <NextFixtureCountdown matches={matches} />
      </div>

      <section className="panel mt-4 p-4">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-primary" />
          <h2 className="font-display text-xl font-bold uppercase">Open predictions</h2>
        </div>
        {missing.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {upcoming.length === 0
              ? "No upcoming matches yet. Check back soon."
              : "All caught up — every upcoming match is predicted."}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {missing.length} match{missing.length > 1 ? "es" : ""} waiting for your call.
            </p>
            <Button asChild className="mt-3 h-11 w-full font-bold uppercase">
              <Link to="/predict">Make predictions</Link>
            </Button>
          </>
        )}
      </section>

      <section className="panel mt-4 p-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-accent" />
          <h2 className="font-display text-xl font-bold uppercase">Latest results</h2>
        </div>
        {finished.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No results in yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {finished.map((m) => {
              const pts = predictionPoints(m, predictions.find((p) => p.match_id === m.id));
              return (
                <li key={m.id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <p className="truncate text-sm font-semibold">
                      {m.player_a} <span className="text-muted-foreground">vs</span> {m.player_b}
                    </p>
                    <span className="shrink-0 font-display text-lg font-bold">
                      {m.score_a}–{m.score_b}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(m.starts_at)} ·{" "}
                    {pts === null ? (
                      "No prediction"
                    ) : (
                      <span className={pts > 0 ? "text-primary" : "text-accent"}>
                        You scored {pts} pt{pts === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel mt-4 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase">Top of the table</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {board.slice(0, 3).map((row, i) => (
            <li key={row.user_id} className="flex items-center justify-between text-sm">
              <span className="truncate">
                <span className="mr-2 font-display text-lg text-gold">{i + 1}</span>
                {row.display_name}
              </span>
              <span className="font-bold">{row.points ?? 0}</span>
            </li>
          ))}
          {board.length === 0 && (
            <li className="text-sm text-muted-foreground">Nobody on the board yet.</li>
          )}
        </ul>
        <Button asChild variant="secondary" className="mt-3 h-10 w-full">
          <Link to="/leaderboard">Full leaderboard</Link>
        </Button>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="panel p-3 text-center">
      <p
        className={`font-display text-3xl font-bold ${highlight ? "text-gradient-gold" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
