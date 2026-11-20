import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/sync-darts-results")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { syncDartsResults } = await import("@/lib/results-sync.server");
          return Response.json(await syncDartsResults(supabaseAdmin));
        } catch (error) {
          console.error("Results sync failed", error instanceof Error ? error.message : "Unknown");
          return Response.json({ success: false }, { status: 502 });
        }
      },
    },
  },
});
