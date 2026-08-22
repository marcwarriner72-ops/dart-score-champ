import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMatches, matchFlag, type Match } from "@/lib/league";
import { hasFired, markFired, notify, remindersEnabled } from "@/lib/reminders";

const WINDOWS: { mins: number; key: string; label: string }[] = [
  { mins: 60, key: "60", label: "starts in about an hour" },
  { mins: 5, key: "5", label: "is about to start" },
];

function upcoming(matches: Match[], now: number) {
  return matches
    .filter((m) => m.status === "upcoming" && new Date(m.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** Watches fixture times and alerts shortly before each throw-off. */
export function useMatchReminders() {
  const { data: matches = [] } = useMatches();
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!remindersEnabled()) return;
    const now = tick;
    const next = upcoming(matches, now);
    if (next.length === 0) return;

    const firstOfComp = new Map<string, string>();
    for (const m of next) {
      const comp = m.tournament?.trim();
      if (comp && !firstOfComp.has(comp)) firstOfComp.set(comp, m.id);
    }

    for (const m of next) {
      const mins = (new Date(m.starts_at).getTime() - now) / 60000;
      for (const w of WINDOWS) {
        if (mins > w.mins || mins <= 0) continue;
        const key = `${m.id}:${w.key}`;
        if (hasFired(key)) continue;
        markFired(key);
        const comp = m.tournament?.trim();
        const isCompOpener = comp && firstOfComp.get(comp) === m.id;
        const title = isCompOpener ? `${comp} ${w.label}` : `Match ${w.label}`;
        const body = `${m.player_a} vs ${m.player_b}${comp ? ` · ${comp}` : ""}`;
        notify(title, body);
        toast(title, { description: body });
        break;
      }
    }
  }, [tick, matches]);
}

/** Slim "next up" bar with a live countdown, shown on every page. */
export function NextUpStrip() {
  const { data: matches = [] } = useMatches();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = upcoming(matches, now)[0];
  if (!next) return null;

  const total = Math.max(0, Math.floor((new Date(next.starts_at).getTime() - now) / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <Link
      to="/predict"
      className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-4 py-1.5 text-xs"
    >
      <Timer className="size-3.5 shrink-0 text-accent" />
      <span className="truncate text-muted-foreground">
        <span className="font-semibold text-foreground">{matchFlag(next)} Next up:</span>{" "}
        {next.player_a} vs {next.player_b}
      </span>
      <span className="ml-auto shrink-0 font-display text-sm font-bold tabular-nums text-gold">
        {clock}
      </span>
    </Link>
  );
}
