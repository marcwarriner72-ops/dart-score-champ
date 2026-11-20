import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { forceResultsSync } from "@/lib/results-sync.functions";

export function SyncResults() {
  const run = useServerFn(forceResultsSync);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const last = useQuery({
    queryKey: ["results-sync-last"],
    queryFn: async () => (await supabase.from("results_sync_runs").select("ran_at, checked, graded, rate_limit_remaining, message").order("ran_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const l = last.data;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const r = await run();
          toast.success(`Results synced: ${r.graded} graded of ${r.checked} checked`);
          await qc.invalidateQueries();
        } catch (e) { toast.error(e instanceof Error ? e.message : "Results sync failed"); }
        finally { setBusy(false); }
      }}>
        <Trophy className={busy ? "animate-pulse" : ""} aria-hidden="true" />
        {busy ? "Fetching results…" : "Fetch Results & 180s Now"}
      </Button>
      <span className="text-xs text-muted-foreground">Every 30 min</span>
      <p className="w-full text-xs text-muted-foreground" role="status">
        {l ? `Last run ${new Date(l.ran_at).toLocaleString()} · ${l.graded} graded / ${l.checked} checked · API requests left today: ${l.rate_limit_remaining ?? "unknown"}${l.message ? ` · ${l.message}` : ""}` : "No results sync has run yet."}
      </p>
    </div>
  );
}
