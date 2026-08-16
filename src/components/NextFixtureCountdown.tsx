import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { formatDate, matchFormatLabel, type Match } from "@/lib/league";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    mins: Math.floor((total % 3600) / 60),
    secs: total % 60,
  };
}

/** Live countdown panel to the next fixture that hasn't thrown off yet. */
export function NextFixtureCountdown({ matches }: { matches: Match[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = matches
    .filter((m) => m.status === "upcoming" && new Date(m.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  if (!next) {
    return (
      <section className="panel p-4">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-accent" />
          <h2 className="font-display text-xl font-bold uppercase">Next fixture</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing scheduled yet — the countdown starts when the next match is added.
        </p>
      </section>
    );
  }

  const { days, hours, mins, secs } = parts(new Date(next.starts_at).getTime() - now);

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-2">
        <Timer className="size-4 text-accent" />
        <h2 className="font-display text-xl font-bold uppercase">Next fixture</h2>
      </div>
      <p className="mt-2 truncate font-display text-lg font-bold uppercase">
        {next.player_a} <span className="text-accent">vs</span> {next.player_b}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDate(next.starts_at)}
        {next.tournament ? ` · ${next.tournament}` : ""} · {matchFormatLabel(next)}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Unit value={days} label="Days" />
        <Unit value={hours} label="Hrs" />
        <Unit value={mins} label="Min" />
        <Unit value={secs} label="Sec" />
      </div>
    </section>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 py-2 text-center">
      <p className="font-display text-2xl font-bold text-gradient-gold tabular-nums">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
