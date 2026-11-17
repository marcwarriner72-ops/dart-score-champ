import { Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Eye, X } from "lucide-react";
import { matchFormatLabel, type Match, type Prediction } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

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

export function todayPredictionRows(matches: Match[], predictions: Prediction[], now = new Date()) {
  const picks = new Map(predictions.map((p) => [p.match_id, p]));
  return matches
    .filter((m) => localDayKey(new Date(m.starts_at)) === localDayKey(now) && picks.has(m.id))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .flatMap((match) => {
      const prediction = picks.get(match.id);
      if (!prediction) return [];
      const completed = new Date(match.starts_at).getTime() <= now.getTime() &&
        (match.status === "completed" || (match.score_a !== null && match.score_b !== null));
      return [{ match, prediction, completed }];
    });
}

export function TodaySummary({ matches, predictions }: { matches: Match[]; predictions: Prediction[] }) {
  const { total, locked, allLocked } = todayStats(matches, predictions);
  const rows = todayPredictionRows(matches, predictions);
  return (
    <section className="today-summary p-4">
    <Link to="/predict" className="block" aria-label="Go to today's fixtures">
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
    <Dialog>
      <DialogPrimitive.Trigger asChild>
        <Button variant="outline" className="mt-4 h-auto min-h-11 w-full whitespace-normal border-gold py-2 text-gold">
          <Eye className="size-4 shrink-0" /> Reveal all today's predictions
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="today-predictions-panel fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border-2 border-gold bg-popover p-4 text-popover-foreground shadow-lg sm:p-6">
          <div className="pr-10">
            <DialogTitle className="font-display text-2xl tracking-normal">Your predictions today</DialogTitle>
            <DialogDescription className="mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} · {rows.length} locked in
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="Close today's predictions">
              <X className="size-5" />
            </Button>
          </DialogClose>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No predictions locked in today yet.</p> : (
              <ul className="divide-y divide-border">
                {rows.map(({ match, prediction, completed }) => (
                  <li key={match.id} className="py-3 first:pt-0 last:pb-0">
                    <div className={completed ? "opacity-45 line-through decoration-foreground/40" : ""}>
                      <div className="mb-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <time dateTime={match.starts_at}>{new Date(match.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                        <span>· {match.tournament}</span>
                        <span className="ml-auto">{completed ? "Completed" : "Locked in"}</span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
                        <span className="break-words font-semibold">{match.player_a}</span><span className="font-bold tabular-nums">{prediction.score_a}</span>
                        <span className="break-words font-semibold">{match.player_b}</span><span className="font-bold tabular-nums">{prediction.score_b}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {matchFormatLabel(match)} · Winner: {prediction.predicted_winner === "a" ? match.player_a : prediction.predicted_winner === "b" ? match.player_b : prediction.predicted_winner}
                        {" · 180s: "}{prediction.guess_180s ?? "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
    </section>
  );
}
