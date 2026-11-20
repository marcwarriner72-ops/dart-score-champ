import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { forceFixtureSync } from "@/lib/fixture-sync.functions";

export function SyncFixtures() {
  const run = useServerFn(forceFixtureSync);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const response = await run();
          const message = `${response.added} added · ${response.updated} time updates · ${response.unchanged} unchanged · ${response.skipped} protected`;
          setResult(message);
          toast.success(`Fixtures synced: ${message}`);
          await queryClient.invalidateQueries();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Fixture sync failed";
          setResult(message);
          toast.error(message);
        } finally { setBusy(false); }
      }}>
        <RefreshCw className={busy ? "animate-spin" : ""} aria-hidden="true" />
        {busy ? "Syncing fixtures…" : "Sync Fixtures Now"}
      </Button>
      <span className="text-xs text-muted-foreground">Every 6 hours · DataSportsAPI</span>
      {result && <p className="w-full text-xs text-muted-foreground" role="status">{result}</p>}
    </div>
  );
}