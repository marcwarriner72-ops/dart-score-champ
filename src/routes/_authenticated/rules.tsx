import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/rules")({
  component: RulesPage,
});

function RulesPage() {
  return (
    <AppShell title="Rules" subtitle="How the league works">
      <div className="space-y-3">
        <Rule points="3" tone="gold" title="Bullseye">
          You called the correct winner <em>and</em> the exact leg score.
        </Rule>
        <Rule points="1" tone="primary" title="On the board">
          Correct winner, but the leg score was off.
        </Rule>
        <Rule points="0" tone="accent" title="Off the wire">
          Wrong winner — nothing scored.
        </Rule>
      </div>

      <div className="panel mt-4 space-y-2 p-4 text-sm text-muted-foreground">
        <p className="font-display text-lg font-bold uppercase text-foreground">The small print</p>
        <p>Predictions can be edited any time until the admin marks a match as finished.</p>
        <p>Other players' picks stay hidden until the result is in.</p>
        <p>The leaderboard updates the moment a final score is entered.</p>
      </div>
    </AppShell>
  );
}

function Rule({
  points,
  tone,
  title,
  children,
}: {
  points: string;
  tone: "gold" | "primary" | "accent";
  title: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "gold"
      ? "bg-gold/20 text-gold"
      : tone === "primary"
        ? "bg-primary/15 text-primary"
        : "bg-accent/15 text-accent";
  return (
    <div className="panel flex items-center gap-4 p-4">
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-full font-display text-2xl font-bold ${toneClass}`}
      >
        {points}
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg font-bold uppercase leading-none">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
