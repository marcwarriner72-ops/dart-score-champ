import { useEffect, useState } from "react";
import { Dartboard3D } from "@/components/Dartboard3D";

export const SPLASH_MS = 7000;

/** Branded splash ported from Race to the Prem, with a revolving 3D dartboard. */
export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const iv = setInterval(() => setProgress(Math.min(100, Math.round(((Date.now() - started) / SPLASH_MS) * 100))), 45);
    const t = setTimeout(() => { clearInterval(iv); setProgress(100); onComplete(); }, SPLASH_MS);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [onComplete]);

  return (
    <div role="status" aria-label="Loading Darts Predictor League" onClick={onComplete} className="dark fixed inset-0 z-[9999] flex select-none flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="splash-vignette pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex size-72 items-center justify-center sm:size-80">
        <svg className="absolute size-full animate-[spin_12s_linear_infinite] motion-reduce:animate-none" viewBox="0 0 300 300" aria-hidden>
          <path id="splashTextPath" d="M 150, 150 m -110, 0 a 110,110 0 1,1 220,0 a 110,110 0 1,1 -220,0" fill="none" />
          <text className="fill-primary font-mono text-[13.5px] font-extrabold uppercase tracking-[2.6px]">
            <textPath href="#splashTextPath" startOffset="0%">Warriner Enterprises Inc. • Brings you • DARTS PREDICTOR LEAGUE • </textPath>
          </text>
        </svg>
        <Dartboard3D className="size-36" />
      </div>
      <div className="z-10 mt-8 flex w-64 flex-col items-center gap-2">
        <span className="animate-pulse text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Chalking the Oche...</span>
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-border bg-muted p-px">
          <div className="h-full rounded-full bg-primary transition-all duration-75" style={{ width: `${progress}%` }} />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{progress}% · tap to skip</span>
      </div>
    </div>
  );
}
