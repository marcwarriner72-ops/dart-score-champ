import { useEffect, useState } from "react";

const EVENT = "darts:throw";

/**
 * Fire the one-shot "dart flies across the screen" confirmation.
 * Safe to call from anywhere; the overlay is mounted once in the root route.
 */
export function throwDart(label = "Saved") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { label } }));
}

/** Global overlay that plays the dart-throw animation. Mount once. */
export function DartThrowOverlay() {
  const [shot, setShot] = useState<{ id: number; label: string } | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function onThrow(e: Event) {
      if (reduced) return;
      const label = (e as CustomEvent<{ label?: string }>).detail?.label ?? "Saved";
      setShot({ id: Date.now(), label });
    }

    window.addEventListener(EVENT, onThrow);
    return () => window.removeEventListener(EVENT, onThrow);
  }, []);

  useEffect(() => {
    if (!shot) return;
    const t = setTimeout(() => setShot(null), 1250);
    return () => clearTimeout(t);
  }, [shot]);

  if (!shot) return null;

  return (
    <div
      key={shot.id}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {/* Board the dart lands in */}
      <div className="dart-board-pop absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-accent/70 bg-accent/10">
        <span className="size-3 rounded-full bg-accent" />
      </div>
      {/* The dart */}
      <span className="dart-throw absolute top-1/2 text-4xl">🎯</span>
      <span className="dart-throw-label absolute left-1/2 top-1/2 mt-16 -translate-x-1/2 whitespace-nowrap rounded-full bg-card/90 px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-accent shadow-lg">
        {shot.label}
      </span>
    </div>
  );
}
