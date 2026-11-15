import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/daily-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { runDailySync } = await import("@/lib/darts-sync.server");
          return Response.json(await runDailySync(supabaseAdmin));
        } catch (e) {
          console.error("daily-sync failed", e);
          return new Response("Sync failed", { status: 500 });
        }
      },
    },
  },
});
