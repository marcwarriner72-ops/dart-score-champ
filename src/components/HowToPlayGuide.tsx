import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus, Upload, MonitorPlay } from "lucide-react";
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

const chapters: Chapter[] = [
  {
    title: "Joining & Switching Leagues",
    short: "Leagues",
    captions: ["Open the league selector at the top of Home.", "Pick the competition you want to follow.", "New friends? Tap Create / Join League."],
    Stage: ({ t }) => {
      const s = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
      return (
        <div className="relative h-full space-y-3 p-4">
          <Ring on={s < 2}><div className="flex items-center justify-between border-2 border-border bg-secondary px-3 py-2 text-sm font-bold">🇬🇧 Grand Slam of Darts <span>▾</span></div></Ring>
          <div className={`space-y-1 overflow-hidden border-2 border-border bg-card text-sm transition-all duration-500 ${s === 1 ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
            {["🇬🇧 Grand Slam of Darts", "🇬🇧 Players Championship Finals", "🇬🇧 World Championship"].map((n, i) => <div key={n} className={`px-3 py-1.5 ${i === 1 ? "bg-primary text-primary-foreground" : ""}`}>{n}</div>)}
          </div>
          <Ring on={s === 2}><div className="bg-primary py-2 text-center text-sm font-bold uppercase text-primary-foreground">+ Create / Join League</div></Ring>
          <Cursor x={s === 2 ? 50 : s === 1 ? 40 : 85} y={s === 2 ? (s === 2 ? 72 : 30) : s === 1 ? 42 : 12} click={t > 0.25 && t < 0.33 || t > 0.85} />
        </div>
      );
    },
  },
  {
    title: "Submitting Match Predictions",
    short: "Predict",
    captions: ["Grand Slam fixtures — Best of 31 legs.", "Type your leg scoreline, e.g. 16–12.", "Hit Save Predictions before the match locks."],
    Stage: ({ t }) => {
      const a = t < 0.33 ? "" : t < 0.5 ? "1" : "16";
      const b = t < 0.5 ? "" : t < 0.6 ? "1" : "12";
      const saved = t > 0.85;
      return (
        <div className="relative h-full p-4">
          <div className={`border-2 bg-card p-3 transition-colors ${saved ? "border-primary" : "border-border"}`}>
            <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground"><span>Grand Slam · Quarter-final</span><span>Best of 31 legs</span></div>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-sm font-bold">
              <span>Luke Littler</span><span className="text-muted-foreground">v</span><span>Luke Humphries</span>
              <Ring on={t > 0.3 && t < 0.6}><div className="h-9 border-2 border-border bg-background text-xl leading-8 tabular-nums">{a}</div></Ring>
              <span>–</span>
              <Ring on={t > 0.3 && t < 0.6}><div className="h-9 border-2 border-border bg-background text-xl leading-8 tabular-nums">{b}</div></Ring>
            </div>
            <div className="mt-2 text-center text-[10px] text-muted-foreground">🔒 Locks at 19:00</div>
          </div>
          <Ring on={t > 0.65} className="mt-3"><div className="bg-primary py-2 text-center text-sm font-bold uppercase text-primary-foreground">{saved ? "✓ Locked in" : "Save Predictions"}</div></Ring>
          <Cursor x={t < 0.3 ? 80 : t < 0.65 ? 30 : 50} y={t < 0.3 ? 10 : t < 0.65 ? 45 : 82} click={t > 0.8 && t < 0.9} />
        </div>
      );
    },
  },
  {
    title: "Scoring & Tiebreakers",
    short: "Scoring",
    captions: ["Exact winner AND score = 3 points.", "Correct winner only = 1 point.", "Nail the exact 180s count for +5 bonus."],
    Stage: ({ t }) => {
      const rows = [
        { l: "Exact score", d: "You 16–12 · Result 16–12", p: "+3" },
        { l: "Correct winner", d: "You 16–10 · Result 16–12", p: "+1" },
        { l: "Exact 180s", d: "You 9 · Result 9", p: "+5" },
      ];
      return (
        <div className="space-y-2 p-4">
          {rows.map((r, i) => (
            <div key={r.l} className={`flex items-center justify-between border-2 bg-card p-3 transition-all duration-700 ${t > i * 0.3 ? "translate-x-0 border-primary opacity-100" : "-translate-x-6 border-border opacity-0"}`}>
              <div><div className="text-sm font-bold">{r.l}</div><div className="text-xs text-muted-foreground tabular-nums">{r.d}</div></div>
              <div className="font-display text-3xl text-primary">{r.p}</div>
            </div>
          ))}
          <div className="text-center text-xs text-muted-foreground">Wrong winner = 0 · Ties split by most exact scores</div>
        </div>
      );
    },
  },
  {
    title: "Live Leaderboard & Standings",
    short: "Table",
    captions: ["The table updates as results come in.", "Arrows show who's climbing or falling.", "Top of the oche wins the tournament!"],
    Stage: ({ t }) => {
      const after = t > 0.4;
      const list = after
        ? [{ n: "Board Bomber Bradwell", p: 72, m: 1 }, { n: "Marc Allah Warriner", p: 69, m: -1 }, { n: "Powelly", p: 40, m: 0 }]
        : [{ n: "Marc Allah Warriner", p: 65, m: 0 }, { n: "Board Bomber Bradwell", p: 69, m: 0 }, { n: "Powelly", p: 40, m: 0 }];
      return (
        <div className="space-y-2 p-4">
          {list.map((r, i) => (
            <div key={r.n} className="flex items-center gap-3 border-2 border-border bg-card px-3 py-2 transition-all duration-700">
              <span className="font-display text-2xl tabular-nums">{i + 1}</span>
              {r.m > 0 ? <ArrowUp className="size-4 text-primary" /> : r.m < 0 ? <ArrowDown className="size-4 text-destructive" /> : <Minus className="size-4 text-muted-foreground" />}
              <span className="flex-1 truncate text-sm font-bold">{r.n}</span>
              <span className="font-display text-2xl tabular-nums">{r.p}</span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    title: "Admin Fixture Upload (Optional)",
    short: "Admin",
    captions: ["Admins: open Admin → Bulk Upload via CSV.", "Use columns Date, Session, Scheduled Start Time, Round, Match Label, Player 1, Player 2.", "Drop the file — fixtures appear instantly."],
    Stage: ({ t }) => (
      <div className="relative h-full space-y-2 p-4">
        <div className="overflow-hidden border-2 border-border bg-card text-[9px]">
          <div className="grid grid-cols-7 bg-secondary font-bold">{["Date", "Session", "Start", "Round", "Label", "Player 1", "Player 2"].map((h) => <span key={h} className="truncate px-1 py-1">{h}</span>)}</div>
          <div className="grid grid-cols-7 text-muted-foreground">{["21/11", "Evening", "19:00", "QF", "Match 1", "Littler", "Humphries"].map((h, i) => <span key={i} className="truncate px-1 py-1">{h}</span>)}</div>
        </div>
        <Ring on={t > 0.4}>
          <div className={`flex flex-col items-center gap-1 border-2 border-dashed p-4 text-xs font-bold transition-colors ${t > 0.75 ? "border-primary text-primary" : "border-border"}`}>
            <Upload className="size-5" />{t > 0.75 ? "✓ 8 fixtures imported" : "Drag & drop CSV here"}
          </div>
        </Ring>
        <Cursor x={t < 0.4 ? 20 : 50} y={t < 0.4 ? 15 : 60} click={t > 0.65 && t < 0.78} />
      </div>
    ),
  },
];

export function HowToPlayGuide() {
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
        <Button variant="ghost" size="icon" aria-label="How to Play / Video Guide" title="How to Play / Video Guide">
          <MonitorPlay className="size-5" />
        </Button>
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
