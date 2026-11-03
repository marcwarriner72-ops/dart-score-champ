import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Trophy, ListChecks } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useMemo } from "react";
import {
  formatDate,
  predictionPoints,
  useMatches,
  useMyPredictions,
  useSession,
  useTournamentLeaderboard,
  useTournaments,
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
  const { data: standings = [] } = useTournamentLeaderboard();
  const { data: tournaments = [] } = useTournaments();

  void tournaments;
  // Current = latest competition with fixtures not yet archived by an admin reset.
  // A finished competition stays on show (for the champion banner) until it's reset.
  const latestLive = matches
    .filter((m) => !m.archived)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
  const currentTournament = latestLive ? latestLive.tournament || "Other" : null;
  const hasActive = !!latestLive;

  const board = useMemo(
    () =>
      standings
        .filter((r) => r.tournament === currentTournament)
        .slice()
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0)),
    [standings, currentTournament],
  );

  // Only the current (still running) competition — after an admin reset there is none until new fixtures arrive.
  const curMatches = matches.filter(
    (m) => !m.archived && (m.tournament || "Other") === currentTournament && hasActive,
  );
  const lastPlayed = curMatches
    .filter((m) => m.score_a !== null && m.score_b !== null)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, 1);
  const finished = lastPlayed;
  const allDone =
    curMatches.length > 0 && curMatches.every((m) => m.score_a !== null && m.score_b !== null);
  const champion = allDone ? board[0] : undefined;

  return (
    <AppShell
      title="Dashboard"
      subtitle={hasActive && currentTournament ? currentTournament : "Waiting for the next competition"}
    >
      <section className="panel p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Current competition
        </p>
        <h2 className="font-display text-2xl font-bold uppercase">
          {hasActive && currentTournament ? currentTournament : "None running"}
        </h2>
      </section>

      {champion && (
        <section className="panel mt-4 border-gold/60 p-4 text-center">
          <PartyPopper className="mx-auto size-8 text-gold" />
          <h2 className="mt-1 font-display text-2xl font-bold uppercase text-gradient-gold">
            Congratulations {champion.display_name}!
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentTournament} champion with {champion.points ?? 0} pts
          </p>
        </section>
      )}

      <div className="mt-4">
        <NextFixtureCountdown matches={matches} />
      </div>

      <section className="panel mt-4 p-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-accent" />
          <h2 className="font-display text-xl font-bold uppercase">Last match played</h2>
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
          <h2 className="font-display text-xl font-bold uppercase">League table</h2>
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
