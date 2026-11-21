import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/sync-live-darts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { syncLiveDarts } = await import("@/lib/live-sync.server");
          return Response.json(await syncLiveDarts(supabaseAdmin));
        } catch (error) {
          console.error("Live sync failed", error instanceof Error ? error.message : "Unknown");
          return Response.json({ success: false }, { status: 502 });
        }
      },
    },
  },
});
