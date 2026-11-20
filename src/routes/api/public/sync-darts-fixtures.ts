import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/sync-darts-fixtures")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { syncDartsFixtures } = await import("@/lib/fixture-sync.server");
          return Response.json(await syncDartsFixtures(supabaseAdmin));
        } catch (error) {
          console.error("Fixture sync failed", error instanceof Error ? error.message : "Unknown error");
          return Response.json({ success: false, error: "Fixture sync failed" }, { status: 502 });
        }
      },
    },
  },
});