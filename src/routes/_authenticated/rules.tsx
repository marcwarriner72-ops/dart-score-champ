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
        <Rule points="+5" tone="gold" title="Maximum bonus">
          Guess the exact number of 180s thrown in the match for 5 extra points on top of your result score.
        </Rule>
      </div>

      <div className="panel mt-4 p-4">
        <p className="font-display text-lg font-bold uppercase text-foreground">How to make predictions</p>
        <ol className="mt-3 space-y-3">
          {[
            ["Open Predict", "Tap Start, then Matches, then Predict. Use the tournament chips or \"To predict\" to find open matches."],
            ["Pick the score", "Enter Player 1 and Player 2 scores in legs or sets (shown on each card). The higher score is your winner."],
            ["Guess the 180s", "Enter how many 180s you think will be thrown in the match for a chance at +5 bonus points."],
            ["Save and Confirm", "Tap Save, then press Confirm in the pop-up. Your pick is only saved after you press Confirm."],
            ["Check it's locked in", "A dart flies across the screen and the card turns green with a \u2713 LOCKED IN badge."],
            ["Change your mind", "Edit and re-save any time until the match starts. After that, picks freeze and everyone's are revealed."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-display font-bold uppercase leading-tight">{t}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel mt-4 space-y-2 p-4 text-sm text-muted-foreground">
        <p className="font-display text-lg font-bold uppercase text-foreground">The small print</p>
        <p>Predictions can be added or edited any time until the match start time.</p>
        <p>Other players' picks stay hidden until throw-off, then everyone's are revealed.</p>
        <p>The leaderboard updates the moment a final score is entered, and completed matches move to the Results archive.</p>
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
