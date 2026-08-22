import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Search, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CountryFlag } from "@/components/CountryFlag";
import { EmptyState } from "@/components/EmptyState";
import { MatchListSkeleton } from "@/components/Skeletons";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  guessCountry,
  hasStarted,
  predictionPoints,
  useMatches,
  useProfiles,
  useSession,
  useVisiblePredictions,
  type Match,
  type Prediction,
} from "@/lib/league";

type Person = { name: string; avatar: string | null };

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
];




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

  const people = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of profiles) map.set(p.id, { name: p.display_name, avatar: p.avatar_url ?? null });
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
        <MatchListSkeleton count={2} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Results" subtitle="Picks revealed at throw-off">
      <h2 className="font-display text-xl font-bold uppercase">In play</h2>
      <div className="mt-2 space-y-3">
        {inPlay.length === 0 ? (
          <EmptyState
            icon={<Target className="size-6" />}
            title="Nothing on the oche"
            description="When a fixture starts, everyone's picks appear here live."
          />
        ) : (
          inPlay.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              predictions={predictions.filter((p) => p.match_id === m.id)}
              people={people}
              meId={user?.id}
            />
          ))
        )}
      </div>

      <h2 className="mt-6 font-display text-xl font-bold uppercase">Archive</h2>
      <div className="mt-2 space-y-3">
        {archive.length === 0 ? (
          <EmptyState
            icon={<Archive className="size-6" />}
            title="Archive is empty"
            description="Finished fixtures and the points they scored land here."
          />
        ) : (
          archive.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              predictions={predictions.filter((p) => p.match_id === m.id)}
              people={people}
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
  people,
  meId,
}: {
  match: Match;
  predictions: Prediction[];
  people: Map<string, Person>;
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
          rows.map(({ p, pts }) => {
            const person = people.get(p.user_id);
            return (
            <li
              key={p.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm"
            >
              <PlayerAvatar path={person?.avatar} name={person?.name} className="size-8 text-[10px]" />
              <span className="truncate font-semibold">
                {p.user_id === meId ? "You" : (person?.name ?? "Player")}
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
            );
          })
        )}
      </ul>
    </section>
  );
}
