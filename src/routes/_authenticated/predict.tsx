import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MatchListSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { throwDart } from "@/components/DartThrow";
import { CalendarCheck, ChevronDown } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
import { PushOptIn } from "@/components/Push";
import {
  formatDate,
  guessCountry,
  hasStarted,
  matchFormatLabel,
  matchTournament,
  useMatches,
  useMyPredictions,
  useSession,
  type Match,
} from "@/lib/league";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ALL_TOURNAMENTS = "__all__";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/predict")({
  component: PredictPage,
  head: () => ({
    meta: [
      { title: "Make Predictions | Darts Predictor League" },
      {
        name: "description",
        content:
          "Pick winners and exact leg scores for upcoming darts fixtures. Predictions can be edited right up until throw-off.",
      },
      { property: "og:title", content: "Make Predictions | Darts Predictor League" },
      {
        property: "og:description",
        content: "Pick winners and exact leg scores before each darts match starts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PredictPage() {
  const { data: user } = useSession();
  const { data: matches = [], isLoading } = useMatches();
  const { data: predictions = [] } = useMyPredictions(user?.id);
  const [tournament, setTournament] = useState<string>(ALL_TOURNAMENTS);
  const [onlyUnpredicted, setOnlyUnpredicted] = useState(false);
  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  const open = matches.filter((m) => m.status === "upcoming" && !hasStarted(m));
  const tournaments = Array.from(new Set(open.map(matchTournament)));
  const inTournament =
    tournament === ALL_TOURNAMENTS ? open : open.filter((m) => matchTournament(m) === tournament);
  const visible = onlyUnpredicted
    ? inTournament.filter((m) => !predictions.some((p) => p.match_id === m.id))
    : inTournament;

  const remaining = inTournament.filter((m) => !predictions.some((p) => p.match_id === m.id)).length;
  const done = inTournament.length - remaining;
  const next = open[0];

  const groups = tournaments
    .map((t) => ({ name: t, fixtures: visible.filter((m) => matchTournament(m) === t) }))
    .filter((g) => g.fixtures.length > 0);
  const openGroups = expanded ?? new Set(next ? [matchTournament(next)] : []);

  function toggleGroup(name: string) {
    setExpanded(
      new Set(
        openGroups.has(name)
          ? [...openGroups].filter((t) => t !== name)
          : [...openGroups, name],
      ),
    );
  }

  return (
    <AppShell title="Predict" subtitle="Editable until throw-off · 3 pts exact · 1 pt winner · +5 exact 180s">
      <div className="mb-4"><PushOptIn /></div>
      {isLoading ? (
        <MatchListSkeleton />
      ) : open.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title="No open fixtures"
          description="Everything has started or finished — see how everyone called it."
          action={
            <Link
              to="/results"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-bold uppercase text-primary-foreground transition-transform active:scale-95"
            >
              View results
            </Link>
          }
        />
      ) : (
        <>
          <section className="panel p-4">
            <p className="font-display text-xl font-bold uppercase">
              {remaining === 0 ? "You're all set" : `${remaining} to call`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {remaining === 0
                ? "Every open fixture is predicted. You can still tweak them until throw-off."
                : `${done} of ${inTournament.length} predicted so far.`}
            </p>
            {next && (
              <p className="mt-2 text-xs text-muted-foreground">
                Next up: {next.player_a} vs {next.player_b} · {formatDate(next.starts_at)}
              </p>
            )}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <FilterChip
                active={tournament === ALL_TOURNAMENTS}
                label="All"
                onClick={() => setTournament(ALL_TOURNAMENTS)}
              />
              {tournaments.map((t) => (
                <FilterChip
                  key={t}
                  active={tournament === t}
                  label={t}
                  onClick={() => setTournament(t)}
                />
              ))}
              <FilterChip
                active={onlyUnpredicted}
                label={`To predict (${remaining})`}
                onClick={() => setOnlyUnpredicted((v) => !v)}
              />
            </div>
          </section>

          <div className="mt-4 space-y-4">
            {visible.length === 0 ? (
              <EmptyState
                title="Nothing here"
                description={
                  onlyUnpredicted
                    ? "You've predicted everything in this view."
                    : "No open fixtures in this tournament yet."
                }
              />
            ) : tournament === ALL_TOURNAMENTS ? (
              groups.map((g) => (
                <TournamentSection
                  key={g.name}
                  name={g.name}
                  matches={g.fixtures}
                  expanded={openGroups.has(g.name)}
                  onToggle={() => toggleGroup(g.name)}
                  userId={user?.id}
                  predictions={predictions}
                />
              ))
            ) : (
              visible.map((m) => (
                <PredictionCard
                  key={m.id}
                  match={m}
                  userId={user?.id}
                  existing={predictions.find((p) => p.match_id === m.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function PredictionCard({
  match,
  userId,
  existing,
}: {
  match: Match;
  userId: string | undefined;
  existing?: { predicted_winner: string; score_a: number; score_b: number; guess_180s?: number | null } | undefined;
}) {
  const queryClient = useQueryClient();
  const [winner, setWinner] = useState<string>(existing?.predicted_winner ?? "");
  const [scoreA, setScoreA] = useState<string>(existing ? String(existing.score_a) : "");
  const [scoreB, setScoreB] = useState<string>(existing ? String(existing.score_b) : "");
  const [guess180s, setGuess180s] = useState<string>(
    existing?.guess_180s == null ? "" : String(existing.guess_180s),
  );
  const [confirming, setConfirming] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const a = Number(scoreA);
      const b = Number(scoreB);
      const { error } = await supabase.from("predictions").upsert(
        {
          match_id: match.id,
          user_id: userId!,
          predicted_winner: winner,
          score_a: a,
          score_b: b,
          guess_180s: guess180s === "" ? null : Number(guess180s),
        },
        { onConflict: "match_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      throwDart("Prediction saved");
      toast.success("Prediction confirmed");
      queryClient.invalidateQueries({ queryKey: ["my-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["all-predictions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  function validate() {
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!winner) return "Pick a winner";
    if (scoreA === "" || scoreB === "" || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0)
      return `Enter a valid ${matchFormatLabel(match).toLowerCase()} score`;
    if (a === b) return "A darts match can't end level";
    if ((a > b ? "a" : "b") !== winner) return "Your leg score doesn't match your chosen winner";
    return null;
  }

  function openConfirm() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setConfirming(true);
  }

  const winnerName = winner === "a" ? match.player_a : match.player_b;
  const isLive = new Date(match.starts_at).getTime() <= Date.now();

  const unit = matchFormatLabel(match).toUpperCase();
  const when = new Date(match.starts_at);
  const meta = [match.round, match.match_label].filter(Boolean).join(" · ");
  const n180 = guess180s === "" ? null : Number(guess180s);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur-md">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_var(--primary)]" />

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <CountryFlag code={match.country ?? guessCountry(match.tournament)} />
              <span className="truncate">{match.tournament || "Match"}</span>
            </p>
            {meta && <p className="mt-0.5 truncate font-display text-lg uppercase leading-tight">{meta}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
              {unit}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
                Live
              </span>
            )}
            {existing && !isLive && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Locked in</span>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["Date", when.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })],
            ["Session", match.session || "—"],
            ["Start", when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-950/70 px-2 py-1.5">
              <dt className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{k}</dt>
              <dd className="truncate text-xs font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Scoreboard */}
      <div className="p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tap your winner, then enter the score</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          {(["a", "b"] as const).map((side, i) => {
            const name = side === "a" ? match.player_a : match.player_b;
            const val = side === "a" ? scoreA : scoreB;
            const set = side === "a" ? setScoreA : setScoreB;
            const active = winner === side;
            const card = (
              <div
                key={side}
                className={`flex flex-col rounded-xl border p-2 transition-all ${active ? "border-primary bg-primary/10 shadow-[0_0_18px_-6px_var(--primary)]" : "border-slate-800 bg-slate-900/60"}`}
              >
                <button
                  type="button"
                  onClick={() => setWinner(side)}
                  className="min-h-10 text-center text-sm font-bold leading-tight active:scale-95"
                >
                  <span className="block text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Player {i + 1} {active && "· Winner"}
                  </span>
                  {name}
                </button>
                <Input
                  inputMode="numeric"
                  className="mt-2 h-14 border-slate-800 bg-slate-950 text-center font-display text-3xl tabular-nums"
                  value={val}
                  onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  aria-label={`${unit} for ${name}`}
                  placeholder="0"
                />
              </div>
            );
            return i === 0 ? (
              [card, (
                <div key="vs" className="flex flex-col items-center justify-end pb-4">
                  <span className="text-[10px] font-black text-muted-foreground">VS</span>
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-primary">{unit}</span>
                </div>
              )]
            ) : card;
          })}
        </div>

        {/* 180s */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">Number of 180s</p>
            <p className="text-[10px] text-accent">Exact guess = +5 bonus · optional</p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="size-9 border-slate-800" onClick={() => setGuess180s(String(Math.max(0, (n180 ?? 0) - 1)))} aria-label="Fewer 180s">−</Button>
            <Input
              inputMode="numeric"
              className="h-10 w-14 border-slate-800 bg-slate-950 text-center font-display text-xl tabular-nums"
              value={guess180s}
              onChange={(e) => setGuess180s(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="–"
              aria-label="Number of 180s in match"
            />
            <Button type="button" variant="outline" size="icon" className="size-9 border-slate-800" onClick={() => setGuess180s(String(Math.min(99, (n180 ?? -1) + 1)))} aria-label="More 180s">+</Button>
          </div>
        </div>

        <Button
          className="mt-4 h-12 w-full font-bold uppercase tracking-wider transition-transform active:scale-[0.98]"
          onClick={openConfirm}
          disabled={save.isPending}
        >
          {existing ? "Update prediction" : "Lock in prediction"}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="max-w-[20rem] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase">Confirm prediction</AlertDialogTitle>
            <AlertDialogDescription>
              {winnerName} to win {scoreA}–{scoreB} in {matchFormatLabel(match).toLowerCase()} (
              {match.player_a} vs {match.player_b}){guess180s !== "" ? `, with ${guess180s} × 180s` : ""}. You can still edit this until the match starts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => save.mutate()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WinnerButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`truncate rounded-lg border px-3 py-3 text-sm font-semibold transition-all active:scale-95 ${
        active
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-secondary/40 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-secondary/40 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function TournamentSection({
  name,
  matches,
  expanded,
  onToggle,
  userId,
  predictions,
}: {
  name: string;
  matches: Match[];
  expanded: boolean;
  onToggle: () => void;
  userId: string | undefined;
  predictions: { match_id: string; predicted_winner: string; score_a: number; score_b: number; guess_180s?: number | null }[];
}) {
  const flagCode = matches[0]?.country ?? guessCountry(name);
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <CountryFlag code={flagCode} />
        <span className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase">
          {name}
        </span>
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
          {matches.length}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="mt-3 space-y-4">
          {matches.map((m) => (
            <PredictionCard
              key={m.id}
              match={m}
              userId={userId}
              existing={predictions.find((p) => p.match_id === m.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
