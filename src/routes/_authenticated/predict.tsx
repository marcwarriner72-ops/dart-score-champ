import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MatchListSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { throwDart } from "@/components/DartThrow";
import { CalendarCheck } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const open = matches.filter((m) => m.status === "upcoming" && !hasStarted(m));
  const tournaments = Array.from(new Set(open.map(matchTournament)));
  const visible =
    tournament === ALL_TOURNAMENTS ? open : open.filter((m) => matchTournament(m) === tournament);

  const done = visible.filter((m) => predictions.some((p) => p.match_id === m.id)).length;
  const next = visible[0];

  return (
    <AppShell title="Predict" subtitle="Editable until throw-off · 3 pts exact score">
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
              {done === visible.length ? "You're all set" : `${visible.length - done} to call`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {done === visible.length
                ? "Every open fixture is predicted. You can still tweak them until throw-off."
                : `${done} of ${visible.length} predicted so far.`}
            </p>
            {next && (
              <p className="mt-2 text-xs text-muted-foreground">
                Next up: {next.player_a} vs {next.player_b} · {formatDate(next.starts_at)}
              </p>
            )}
            {tournaments.length > 1 && (
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="tournament-filter" className="text-xs uppercase tracking-wide">
                  Tournament
                </Label>
                <Select value={tournament} onValueChange={setTournament}>
                  <SelectTrigger id="tournament-filter" className="h-11 w-full">
                    <SelectValue placeholder="All tournaments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TOURNAMENTS}>All tournaments</SelectItem>
                    {tournaments.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          <div className="mt-4 space-y-4">
            {visible.length === 0 ? (
              <EmptyState
                title="Nothing here"
                description="No open fixtures in this tournament yet."
              />
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
  existing?: { predicted_winner: string; score_a: number; score_b: number } | undefined;
}) {
  const queryClient = useQueryClient();
  const [winner, setWinner] = useState<string>(existing?.predicted_winner ?? "");
  const [scoreA, setScoreA] = useState<string>(existing ? String(existing.score_a) : "");
  const [scoreB, setScoreB] = useState<string>(existing ? String(existing.score_b) : "");
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
      return "Enter a valid leg score";
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

  return (
    <div className="panel p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <CountryFlag code={match.country ?? guessCountry(match.tournament)} />
            <span className="truncate">{match.tournament || "Match"}</span>
          </p>

          <p className="truncate font-display text-xl font-bold uppercase">
            {match.player_a} <span className="text-accent">vs</span> {match.player_b}
          </p>
        </div>
        {existing && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary">
            Locked in
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{formatDate(match.starts_at)}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <WinnerButton
          active={winner === "a"}
          label={match.player_a}
          onClick={() => setWinner("a")}
        />
        <WinnerButton
          active={winner === "b"}
          label={match.player_b}
          onClick={() => setWinner("b")}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <Input
          inputMode="numeric"
          className="h-12 w-16 text-center font-display text-2xl"
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value.replace(/\D/g, "").slice(0, 2))}
          aria-label={`Legs for ${match.player_a}`}
          placeholder="0"
        />
        <span className="font-display text-2xl text-muted-foreground">
          {matchFormatLabel(match).toLowerCase()}
        </span>
        <Input
          inputMode="numeric"
          className="h-12 w-16 text-center font-display text-2xl"
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value.replace(/\D/g, "").slice(0, 2))}
          aria-label={`Legs for ${match.player_b}`}
          placeholder="0"
        />
      </div>

      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        This match is played in {matchFormatLabel(match).toLowerCase()}
      </p>

      <Button
        className="mt-3 h-11 w-full font-bold uppercase transition-transform active:scale-[0.98]"
        onClick={openConfirm}
        disabled={save.isPending}
      >
        {existing ? "Update prediction" : "Submit prediction"}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="max-w-[20rem] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase">Confirm prediction</AlertDialogTitle>
            <AlertDialogDescription>
              {winnerName} to win {scoreA}–{scoreB} in {matchFormatLabel(match).toLowerCase()} (
              {match.player_a} vs {match.player_b}). You can still edit this until the match starts.
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
