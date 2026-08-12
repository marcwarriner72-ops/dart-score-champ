import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useLeaderboard, useSession } from "@/lib/league";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: user } = useSession();
  const { data: board = [], isLoading } = useLeaderboard();

  return (
    <AppShell title="Leaderboard" subtitle="Live standings">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : board.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted-foreground">
          No players yet.
        </div>
      ) : (
        <ol className="space-y-2">
          {board.map((row, i) => {
            const isMe = row.user_id === user?.id;
            return (
              <li
                key={row.user_id}
                className={`panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 ${
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
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {row.display_name}
                    {isMe && <span className="ml-2 text-xs text-primary">you</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.predictions_made ?? 0} played · {row.exact_hits ?? 0} exact
                  </p>
                </div>
                <span className="shrink-0 font-display text-2xl font-bold">{row.points ?? 0}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="panel mt-4 p-4 text-sm text-muted-foreground">
        <p className="font-display text-lg font-bold uppercase text-foreground">Scoring</p>
        <p className="mt-1">3 pts — correct winner and exact leg score</p>
        <p>1 pt — correct winner, wrong leg score</p>
        <p>0 pts — wrong winner</p>
      </div>
    </AppShell>
  );
}
