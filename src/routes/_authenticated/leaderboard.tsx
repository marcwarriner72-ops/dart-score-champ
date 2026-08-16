import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { EmptyState } from "@/components/EmptyState";
import { RowListSkeleton } from "@/components/Skeletons";
import {
  useLeaderboard,
  useProfiles,
  useSession,
  useTournamentLeaderboard,
  useTournaments,
  type LeaderboardRow,
} from "@/lib/league";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_TIME = "__all__";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "League Table | Darts Predictor League" },
      {
        name: "description",
        content:
          "Live darts standings that reset for every tournament, with an archive of finished tournament tables.",
      },
      { property: "og:title", content: "League Table | Darts Predictor League" },
      {
        property: "og:description",
        content: "Per-tournament darts standings plus an archive of past winners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LeaderboardPage() {
  const { data: user } = useSession();
  const { data: allTime = [], isLoading: loadingAll } = useLeaderboard();
  const { data: perTournament = [], isLoading: loadingT } = useTournamentLeaderboard();
  const { data: tournaments = [] } = useTournaments();
  const { data: profiles = [] } = useProfiles();
  const avatarByUser = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.avatar_url])),
    [profiles],
  );

  const active = tournaments.filter((t) => t.is_active);
  const archived = tournaments.filter((t) => !t.is_active);

  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? active[0]?.tournament ?? tournaments[0]?.tournament ?? ALL_TIME;

  const rows: LeaderboardRow[] = useMemo(() => {
    if (current === ALL_TIME) return allTime;
    return perTournament
      .filter((r) => r.tournament === current)
      .slice()
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }, [current, allTime, perTournament]);

  const isLoading = loadingAll || loadingT;

  return (
    <AppShell title="Table" subtitle="Standings reset each tournament">
      <Select value={current} onValueChange={setSelected}>
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="Choose a tournament" />
        </SelectTrigger>
        <SelectContent>
          {tournaments.map((t) => (
            <SelectItem key={t.tournament} value={t.tournament}>
              {t.tournament}
              {t.is_active ? " · live" : " · finished"}
            </SelectItem>
          ))}
          <SelectItem value={ALL_TIME}>All time</SelectItem>
        </SelectContent>
      </Select>

      <div className="mt-4">
        {isLoading ? (
          <RowListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Trophy className="size-6" />}
            title="No points yet"
            description="Points land here as soon as results are entered for this tournament."
          />
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => {
              const isMe = row.user_id === user?.id;
              return (
                <li
                  key={row.user_id}
                  className={`panel grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 p-3 ${
                    isMe ? "ring-1 ring-primary/60" : ""
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${
                      i === 0
                        ? "bg-gold/20 text-gold"
                        : i < 3
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <PlayerAvatar
                    path={avatarByUser.get(row.user_id ?? "")}
                    name={row.display_name}
                    className="size-9"
                  />

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {row.display_name}
                      {isMe && <span className="ml-2 text-xs text-primary">you</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.predictions_made ?? 0} played · {row.exact_hits ?? 0} exact
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-2xl font-bold">
                    {row.points ?? 0}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {archived.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <Archive className="size-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold uppercase">Archive</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Finished tournaments keep their final table — tap one to view it.
          </p>
          <ul className="mt-2 space-y-2">
            {archived.map((t) => {
              const table = perTournament
                .filter((r) => r.tournament === t.tournament)
                .slice()
                .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
              const winner = table[0];
              return (
                <li key={t.tournament}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.tournament)}
                    className="panel grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{t.tournament}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.match_count} match{t.match_count === 1 ? "" : "es"}
                        {winner ? ` · won by ${winner.display_name}` : ""}
                      </span>
                    </span>
                    <Trophy className="size-4 shrink-0 text-gold" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="panel mt-6 p-4 text-sm text-muted-foreground">
        <p className="font-display text-lg font-bold uppercase text-foreground">Scoring</p>
        <p className="mt-1">3 pts — correct winner and exact leg score</p>
        <p>1 pt — correct winner, wrong leg score</p>
        <p>0 pts — wrong winner</p>
      </div>
    </AppShell>
  );
}
