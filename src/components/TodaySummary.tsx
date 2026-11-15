import { Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import type { Match, Prediction } from "@/lib/league";

/** Local-date key (YYYY-MM-DD) for comparing "today". */
export function localDayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function todayStats(matches: Match[], predictions: Pick<Prediction, "match_id">[], now = new Date()) {
  const key = localDayKey(now);
  const today = matches.filter((m) => localDayKey(new Date(m.starts_at)) === key);
  const ids = new Set(predictions.map((p) => p.match_id));
  const locked = today.filter((m) => ids.has(m.id)).length;
  return { total: today.length, locked, allLocked: today.length > 0 && locked === today.length };
}

export function TodaySummary({ matches, predictions }: { matches: Match[]; predictions: Prediction[] }) {
  const { total, locked, allLocked } = todayStats(matches, predictions);
  return (
    <Link to="/predict" className="panel block p-4 transition active:scale-[0.99]" aria-label="Go to today's fixtures">
      <div className="flex items-center gap-2">
        <CalendarCheck className="size-4 text-accent" />
        <h2 className="font-display text-xl font-bold uppercase">Today's summary</h2>
        {allLocked && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            <CheckCircle2 className="size-3" /> All locked in
          </span>
        )}
      </div>
      {total === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No matches scheduled today</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="font-display text-3xl font-bold tabular-nums">{total}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Matches today</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className={`font-display text-3xl font-bold tabular-nums ${allLocked ? "text-primary" : ""}`}>
              {locked}/{total}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Locked in</p>
          </div>
        </div>
      )}
    </Link>
  );
}
