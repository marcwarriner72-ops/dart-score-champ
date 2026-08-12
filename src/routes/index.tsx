import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Trophy, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Darts Predictor League — Predict, Score, Win Bragging Rights" },
      {
        name: "description",
        content:
          "A private darts prediction league for you and your mates. Call the winner, nail the leg score, and top the live leaderboard.",
      },
      { property: "og:title", content: "Darts Predictor League" },
      {
        property: "og:description",
        content: "Call the winner, nail the leg score, top the live leaderboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-between px-6 py-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary">
          Oche ready
        </p>
        <h1 className="mt-3 font-display text-6xl font-bold uppercase leading-[0.9]">
          Darts
          <br />
          <span className="text-gradient-gold">Predictor</span>
          <br />
          League
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Pick the winner and the exact leg score for every match. Three points for a bullseye
          call, one for the right winner. Winner takes the bragging rights.
        </p>
      </div>

      <div className="my-10 space-y-3">
        <Feature icon={<ListChecks className="size-5" />} title="Submit predictions">
          Upcoming matches, one tap each.
        </Feature>
        <Feature icon={<Target className="size-5" />} title="Exact-score bonus">
          3 pts exact, 1 pt winner only.
        </Feature>
        <Feature icon={<Trophy className="size-5" />} title="Live leaderboard">
          Updated the moment results land.
        </Feature>
      </div>

      <div className="space-y-3">
        <Button asChild size="lg" className="h-13 w-full text-base font-bold uppercase tracking-wide">
          <Link to="/auth">Sign in / Join the league</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Invite-only fun between friends.
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg font-bold uppercase leading-none">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
