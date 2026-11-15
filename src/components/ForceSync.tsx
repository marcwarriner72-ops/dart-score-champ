import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { forceDailySync } from "@/lib/darts-sync.functions";

export function ForceSync() {
  const run = useServerFn(forceDailySync);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel mt-6 space-y-2 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Daily auto-sync (06:00 UTC)</p>
      <p className="text-sm text-muted-foreground">Updates the PDC calendar and adds today's matches from the order of play.</p>
      <Button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await run();
            toast.success(`Synced ${r.calendarEvents} calendar events · ${r.fixturesAdded} new fixtures today`);
            qc.invalidateQueries();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Sync failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw className={busy ? "animate-spin" : ""} /> {busy ? "Syncing…" : "Force Sync Now"}
      </Button>
    </section>
  );
}
