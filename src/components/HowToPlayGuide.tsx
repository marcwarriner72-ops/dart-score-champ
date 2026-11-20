import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus, MonitorPlay, Lock, Share, SquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SCENE_MS = 6000;

type Chapter = { title: string; short: string; captions: string[]; Stage: (p: { t: number }) => ReactNode };

function Cursor({ x, y, click }: { x: number; y: number; click?: boolean }) {
  return (
    <div className="pointer-events-none absolute z-20 transition-all duration-700 ease-out" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className={`absolute -left-4 -top-4 size-8 rounded-full border-2 border-accent ${click ? "animate-ping" : ""}`} />
      <svg width="18" height="18" viewBox="0 0 24 24" className="relative fill-foreground stroke-background drop-shadow">
        <path d="M3 2l7 19 2.5-7.5L20 11z" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

const Ring = ({ on, children, className = "" }: { on: boolean; children: ReactNode; className?: string }) => (
  <div className={`transition-all duration-500 ${on ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""} ${className}`}>{children}</div>
);

const Toast = ({ on }: { on: boolean }) => (
  <div className={`absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow transition-all duration-500 ${on ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>✓ Predictions saved</div>
);

const chapters: Chapter[] = [
  {
    title: "Switching Leagues & Tabs",
    short: "Leagues",
    captions: ["Tap the league dropdown to switch competitions.", "Pick the league you want to follow.", "Hop between Predict, Standings and Results tabs."],
    Stage: ({ t }) => {
      const s = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
      const tab = t < 0.78 ? 0 : t < 0.9 ? 1 : 2;
      return (
        <div className="relative h-full space-y-3 p-4">
          <Ring on={s < 2}><div className="flex items-center justify-between border-2 border-border bg-secondary px-3 py-2 text-sm font-bold">🇬🇧 Grand Slam of Darts <span>▾</span></div></Ring>
          <div className={`overflow-hidden border-2 border-border bg-card text-sm transition-all duration-500 ${s === 1 ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
            {["🇬🇧 Grand Slam of Darts", "🇬🇧 Players Championship Finals", "🇬🇧 World Championship"].map((n, i) => <div key={n} className={`px-3 py-1.5 ${i === 1 ? "bg-primary text-primary-foreground" : ""}`}>{n}</div>)}
          </div>
          <Ring on={s === 2} className="absolute inset-x-4 bottom-12">
            <div className="grid grid-cols-3 border-2 border-border text-center text-xs font-bold uppercase">
              {["Predict", "Standings", "Results"].map((n, i) => <div key={n} className={`py-2 transition-colors ${tab === i ? "bg-primary text-primary-foreground" : "bg-card"}`}>{n}</div>)}
            </div>
          </Ring>
          <Cursor x={s === 2 ? 18 + tab * 32 : s === 1 ? 40 : 85} y={s === 2 ? 80 : s === 1 ? 40 : 12} click={(t > 0.25 && t < 0.33) || t > 0.75} />
        </div>
      );
    },
  },
  {
    title: "Predicting Scores & 180s",
    short: "Predict",
    captions: ["Open an upcoming Grand Slam fixture — Best of 31 legs.", "Enter your leg score (16–13) and total 180s (14).", "Tap Save Predictions — a green toast confirms it."],
    Stage: ({ t }) => {
      const s = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
      return (
        <div className="relative h-full p-4">
          <Toast on={t > 0.75} />
          <div className="border-2 border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase text-accent">Grand Slam of Darts · Best of 31 legs</p>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-sm font-bold">
              <span>Luke Littler</span><span className="text-muted-foreground">v</span><span>Luke Humphries</span>
            </div>
            <Ring on={s === 1} className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {[s >= 1 ? "16" : "–", s >= 1 ? "13" : "–"].map((v, i) => <div key={i} className="border-2 border-border bg-secondary py-2 text-center font-display text-2xl tabular-nums">{v}</div>)}
              </div>
              <div className="mt-2 flex items-center justify-between border-2 border-border bg-secondary px-3 py-1.5 text-sm"><span>Total 180s</span><span className="font-display text-xl tabular-nums">{s >= 1 ? 14 : "–"}</span></div>
            </Ring>
            <Ring on={s === 2} className="mt-3"><div className="bg-primary py-2 text-center text-sm font-bold uppercase text-primary-foreground">Save Predictions</div></Ring>
          </div>
          <Cursor x={s === 2 ? 50 : s === 1 ? 30 : 50} y={s === 2 ? 78 : s === 1 ? 42 : 25} click={t > 0.66 && t < 0.78} />
        </div>
      );
    },
  },
  {
    title: "Lock Deadlines & Editing",
    short: "Locks",
    captions: ["Change your scores and 180s as often as you like…", "…right up until the countdown reaches 00:00.", "At start time a padlock locks the fixture automatically."],
    Stage: ({ t }) => {
      const secs = Math.max(0, Math.round(10 - t * 15));
      const locked = secs === 0;
      return (
        <div className="relative h-full p-4">
          <div className={`border-2 bg-card p-3 transition-colors ${locked ? "border-muted-foreground/40" : "border-border"}`}>
            <div className="flex items-center justify-between text-xs font-bold uppercase">
              <span>Starts in</span>
              <Ring on={t > 0.33 && t < 0.7}><span className={`font-display text-2xl tabular-nums ${locked ? "text-destructive" : "text-accent"}`}>00:{String(secs).padStart(2, "0")}</span></Ring>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[t < 0.2 ? "16" : "15", t < 0.2 ? "13" : "16"].map((v, i) => <div key={i} className={`border-2 border-border py-2 text-center font-display text-2xl tabular-nums ${locked ? "opacity-50" : "bg-secondary"}`}>{v}</div>)}
            </div>
            <div className={`mt-3 flex items-center justify-center gap-2 py-2 text-sm font-bold uppercase transition-all duration-500 ${locked ? "scale-100 bg-secondary opacity-100" : "scale-75 opacity-0"}`}>
              <Lock className="size-4" /> Locked
            </div>
          </div>
          <Cursor x={locked ? 50 : 30} y={locked ? 75 : 45} click={t > 0.1 && t < 0.2} />
        </div>
      );
    },
  },
  {
    title: "Viewing Rivals' Picks",
    short: "Rivals",
    captions: ["Once a match is locked or live, tap it.", "Every league member's leg score and 180s appear.", "Compare picks while you watch the broadcast."],
    Stage: ({ t }) => {
      const open = t > 0.3;
      const picks = [["Marc", "16–13", 14], ["Neil", "16–12", 11], ["Kev", "14–16", 9]] as const;
      return (
        <div className="relative h-full space-y-2 p-4">
          <Ring on={!open}><div className="flex items-center justify-between border-2 border-border bg-card px-3 py-2 text-sm font-bold"><span>Littler v Humphries</span><span className="rounded bg-destructive px-1.5 text-[10px] text-destructive-foreground">LIVE</span></div></Ring>
          <div className={`space-y-1 overflow-hidden transition-all duration-700 ${open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
            {picks.map(([n, sc, x], i) => (
              <Ring key={n} on={t > 0.66 && i === 1}>
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-2 border-border bg-secondary px-3 py-1.5 text-sm"><span className="font-semibold">{n}</span><span className="tabular-nums">{sc}</span><span className="tabular-nums text-accent">{x}×180</span></div>
              </Ring>
            ))}
          </div>
          <Cursor x={open ? 60 : 40} y={open ? 50 : 12} click={t > 0.2 && t < 0.3} />
        </div>
      );
    },
  },
  {
    title: "Points, 180s Bonuses & Tiebreakers",
    short: "Points",
    captions: ["Correct winner = 1 pt. Exact leg score = 3 pts.", "Exact number of 180s = +5 bonus points.", "Ties: most exact scores, then closest 180s."],
    Stage: ({ t }) => {
      const s = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
      const rows = [["Correct winner", "+1"], ["Exact leg score", "+3"], ["Exact 180s", "+5"]];
      return (
        <div className="relative h-full space-y-2 p-4">
          {rows.map(([l, p], i) => (
            <Ring key={l} on={(s === 0 && i < 2) || (s === 1 && i === 2)}>
              <div className={`flex items-center justify-between border-2 border-border bg-card px-3 py-2 transition-opacity ${s === 2 ? "opacity-50" : ""}`}><span className="text-sm font-semibold">{l}</span><span className="font-display text-2xl text-accent">{p}</span></div>
            </Ring>
          ))}
          <Ring on={s === 2}>
            <div className={`border-2 border-gold/60 bg-secondary px-3 py-2 text-xs transition-opacity ${s === 2 ? "opacity-100" : "opacity-40"}`}>
              <p className="font-bold uppercase text-gold">Tiebreakers</p>
              <p>1. Most exact scores · 2. Closest 180s</p>
            </div>
          </Ring>
        </div>
      );
    },
  },
  {
    title: "Live Standings & Quick Mobile Access",
    short: "Standings",
    captions: ["Results land and the table updates live.", "Arrows show who's climbing and who's dropping.", "Tip: Share / Menu → Add to Home Screen for instant access."],
    Stage: ({ t }) => {
      const swapped = t > 0.3;
      const base = [{ n: "Neil", p: 69 }, { n: "Marc", p: swapped ? 73 : 65 }, { n: "Kev", p: 40 }];
      const rows = swapped ? [base[1]!, base[0]!, base[2]!] : base;
      const tip = t > 0.66;
      return (
        <div className="relative h-full p-4">
          <ol className={`space-y-2 transition-opacity duration-500 ${tip ? "opacity-20" : ""}`}>
            {rows.map((r, i) => {
              const mv = !swapped ? 0 : r.n === "Marc" ? 1 : r.n === "Neil" ? -1 : 0;
              return (
                <li key={r.n} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-2 border-border bg-card px-3 py-2 text-sm transition-all duration-700">
                  <span className="font-display text-lg">{i + 1}</span><span className="font-semibold">{r.n}</span>
                  {mv > 0 ? <ArrowUp className="size-4 text-primary" /> : mv < 0 ? <ArrowDown className="size-4 text-destructive" /> : <Minus className="size-4 text-muted-foreground" />}
                  <span className="font-display text-xl tabular-nums">{r.p}</span>
                </li>
              );
            })}
          </ol>
          <div className={`absolute inset-x-6 bottom-12 border-2 border-accent bg-card p-3 text-sm transition-all duration-500 ${tip ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
            <p className="flex items-center gap-2 font-bold"><Share className="size-4" /> Share / ⋮ Menu</p>
            <Ring on={tip} className="mt-2"><p className="flex items-center gap-2 bg-secondary px-2 py-1.5 font-semibold"><SquarePlus className="size-4" /> Add to Home Screen</p></Ring>
          </div>
          <Cursor x={tip ? 45 : 85} y={tip ? 78 : 22} click={t > 0.85} />
        </div>
      );
    },
  },
];

export function HowToPlayGuide({ compact = false }: { compact?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [ch, setCh] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const last = useRef(0);

  useEffect(() => {
    if (!open || !playing) return;
    last.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last.current) * speed;
      last.current = now;
      setElapsed((e) => {
        const n = e + dt;
        if (n >= SCENE_MS) {
          setCh((c) => {
            if (c >= chapters.length - 1) { setPlaying(false); return c; }
            return c + 1;
          });
          return ch >= chapters.length - 1 ? SCENE_MS : 0;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, playing, speed, ch]);

  const go = (i: number) => { setCh(Math.max(0, Math.min(chapters.length - 1, i))); setElapsed(0); setPlaying(true); };
  const t = elapsed / SCENE_MS;
  const total = (ch + t) / chapters.length;
  const chapter = chapters[ch]!;
  const caption = chapter.captions[Math.min(2, Math.floor(t * 3))];
  const ended = ch === chapters.length - 1 && elapsed >= SCENE_MS;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) go(0); }}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold uppercase">
            <MonitorPlay className="size-4 text-accent" /> How to Play &amp; Video Guide
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="How to Play / Video Guide" title="How to Play / Video Guide">
            <MonitorPlay className="size-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border-2 p-0">
        <div className="px-4 pt-4">
          <DialogTitle className="font-display text-2xl">How to Play · Video Guide</DialogTitle>
          <DialogDescription className="text-xs">Chapter {ch + 1} of {chapters.length}: {chapter.title}</DialogDescription>
        </div>
        <div className="relative mx-4 mt-3 aspect-[4/3] overflow-hidden border-2 border-border bg-background">
          <div key={ch} className="h-full animate-in fade-in slide-in-from-right-4 duration-500"><chapter.Stage t={t} /></div>
          <div className="absolute inset-x-0 bottom-0 bg-background/85 px-3 py-2 text-center text-sm font-semibold" aria-live="polite">{caption}</div>
        </div>
        <div className="space-y-3 p-4">
          <div className="h-1.5 w-full cursor-pointer bg-secondary" role="progressbar" aria-valuenow={Math.round(total * 100)} aria-valuemin={0} aria-valuemax={100}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const f = (e.clientX - r.left) / r.width * chapters.length; setCh(Math.min(chapters.length - 1, Math.floor(f))); setElapsed((f % 1) * SCENE_MS); }}>
            <div className="h-full bg-primary" style={{ width: `${total * 100}%` }} />
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => go(ch - 1)} aria-label="Previous chapter"><ChevronLeft className="size-5" /></Button>
            <Button size="icon" onClick={() => (ended ? go(0) : setPlaying((p) => !p))} aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}>
              {ended ? <RotateCcw className="size-5" /> : playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => go(ch + 1)} aria-label="Next chapter"><ChevronRight className="size-5" /></Button>
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">{Math.floor((ch * SCENE_MS + elapsed) / 1000)}s / {chapters.length * SCENE_MS / 1000}s</span>
            <Button size="sm" variant="outline" className="ml-auto tabular-nums" onClick={() => setSpeed((s) => (s === 1 ? 1.5 : 1))} aria-label="Playback speed">{speed}x</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((c, i) => (
              <button key={c.short} onClick={() => go(i)} className={`border-2 px-2 py-1 text-[11px] font-bold uppercase ${i === ch ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {i + 1}. {c.short}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
