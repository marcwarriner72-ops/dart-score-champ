import { Dartboard3D } from "@/components/Dartboard3D";

export function DartLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <Dartboard3D className="size-16" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
