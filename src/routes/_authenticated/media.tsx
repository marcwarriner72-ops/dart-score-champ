import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MediaDock } from "@/components/MediaDock";

export const Route = createFileRoute("/_authenticated/media")({
  component: MediaPage,
  head: () => ({
    meta: [
      { title: "Sports Media Dock | Darts Predictor League" },
      { name: "description", content: "Watch free darts and sports highlights from PDC, Sky Sports and BBC Sport." },
      { property: "og:title", content: "Sports Media Dock | Darts Predictor League" },
      { property: "og:description", content: "Free darts and sports highlights in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MediaPage() {
  return (
    <AppShell title="Media" subtitle="Sports Media Dock">
      <MediaDock />
    </AppShell>
  );
}
