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

const PAGE_SIZE = 5;




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

  const [query, setQuery] = useState("");
  const [tournament, setTournament] = useState("all");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(0);
  const yearOptions = useMemo(
    () => [...new Set(matches.map((m) => String(new Date(m.starts_at).getFullYear())))].sort().reverse(),
    [matches],
  );
  const [state, setState] = useState("finished");

  const inPlay = matches.filter((m) => m.status !== "finished" && hasStarted(m));

  const tournamentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) if (m.tournament) set.add(m.tournament);
    return [...set].sort();
  }, [matches]);

  const archive = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches
      .filter((m) => {
        if (state === "finished" && m.status !== "finished") return false;
        if (state === "pending" && m.status === "finished") return false;
        if (state !== "all" && state !== "finished" && state !== "pending") return false;
        if (state === "pending" && !hasStarted(m)) return false;
        if (state === "all" && !hasStarted(m) && m.status !== "finished") return false;
        if (tournament !== "all" && (m.tournament ?? "Other") !== tournament) return false;
        if (period !== "all" && String(new Date(m.starts_at).getFullYear()) !== period) return false;
        if (
          q &&
          !`${m.player_a} ${m.player_b} ${m.tournament ?? ""}`.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((x, y) => new Date(y.starts_at).getTime() - new Date(x.starts_at).getTime());
  }, [matches, query, tournament, period, state]);

  const pageCount = Math.max(1, Math.ceil(archive.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = archive.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const pageOptions = Array.from({ length: pageCount }, (_, i) => i);

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
      <div className="panel mt-2 space-y-2 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search player or competition"
            className="h-10 pl-9"
            aria-label="Search the archive"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={tournament} onValueChange={(v) => { setTournament(v); setPage(0); }}>
            <SelectTrigger className="h-10" aria-label="Filter by competition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {tournamentOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(0); }}>
            <SelectTrigger className="h-10" aria-label="Filter by year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={(v) => { setState(v); setPage(0); }}>
            <SelectTrigger className="h-10" aria-label="Filter by completion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="finished">Completed</SelectItem>
              <SelectItem value="pending">Awaiting result</SelectItem>
              <SelectItem value="all">Everything</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {archive.length === 0 ? (
          <EmptyState
            icon={<Archive className="size-6" />}
            title="Nothing to show"
            description="Try clearing the search or widening the date range."
          />
        ) : (
          pageItems.map((m) => (
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
      {archive.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{archive.length} fixtures</span>
          <Select value={String(safePage)} onValueChange={(v) => setPage(Number(v))}>
            <SelectTrigger className="h-10 w-44" aria-label="Choose archive page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageOptions.map((i) => (
                <SelectItem key={i} value={String(i)}>
                  Page {i + 1} of {pageCount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <CountryFlag code={match.country ?? guessCountry(match.tournament)} />
            <span className="truncate">{match.tournament || "Match"}</span>
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
