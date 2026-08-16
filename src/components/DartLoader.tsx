export function DartLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="relative h-10 w-40 overflow-hidden">
        <span className="absolute right-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border-2 border-accent/70 bg-accent/10">
          <span className="size-2 rounded-full bg-accent" />
        </span>
        <span className="dart-fly absolute top-1/2 -translate-y-1/2 text-2xl" aria-hidden="true">
          🎯
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
