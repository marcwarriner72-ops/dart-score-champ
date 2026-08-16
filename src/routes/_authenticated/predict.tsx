import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { DartLoader } from "@/components/DartLoader";
import {
  formatDate,
  hasStarted,
  useMatches,
  useMyPredictions,
  useSession,
  type Match,
} from "@/lib/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const open = matches.filter((m) => m.status === "upcoming" && !hasStarted(m));

  return (
    <AppShell title="Predict" subtitle="Editable until throw-off · 3 pts exact score">
      {isLoading ? (
        <DartLoader label="Loading fixtures…" />
      ) : open.length === 0 ? (
        <div className="panel p-6 text-center">
          <p className="font-display text-xl uppercase">No open fixtures</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything has started or finished. See how everyone called it in the{" "}
            <Link to="/results" className="text-primary underline">
              results
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {open.map((m) => (
            <PredictionCard
              key={m.id}
              match={m}
              userId={user?.id}
              existing={predictions.find((p) => p.match_id === m.id)}
            />
          ))}
        </div>
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {match.tournament || "Match"}
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
        <span className="font-display text-2xl text-muted-foreground">legs</span>
        <Input
          inputMode="numeric"
          className="h-12 w-16 text-center font-display text-2xl"
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value.replace(/\D/g, "").slice(0, 2))}
          aria-label={`Legs for ${match.player_b}`}
          placeholder="0"
        />
      </div>

      <Button
        className="mt-4 h-11 w-full font-bold uppercase"
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
              {winnerName} to win {scoreA}–{scoreB} in {match.player_a} vs {match.player_b}. You can
              still edit this until the match starts.
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
      className={`truncate rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-secondary/40 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
