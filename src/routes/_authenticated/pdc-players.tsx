import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { playerFlag, usePdcPlayers, usePlayerPortrait, type PdcPlayer } from "@/lib/pdc-players";

export const Route = createFileRoute("/_authenticated/pdc-players")({
  head: () => ({
    meta: [
      { title: "PDC Players · Darts Predictor League" },
      { name: "description", content: "Directory of top PDC players with nicknames, flags and Order of Merit rankings." },
      { property: "og:title", content: "PDC Players · Darts Predictor League" },
      { property: "og:description", content: "Directory of top PDC players with nicknames, flags and Order of Merit rankings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PdcPlayersPage,
});

function PdcPlayersPage() {
  const { data = [], isLoading } = usePdcPlayers();
  const [q, setQ] = useState("");
  const list = data.filter((p) => `${p.name} ${p.nickname ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <AppShell title="PDC Players" subtitle="Order of Merit directory">
      <Input placeholder="Search name or nickname…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-10" />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading players…</p> : null}
      <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => <PlayerCard key={p.player_id} p={p} />)}
      </div>
    </AppShell>
  );
}

function PlayerCard({ p }: { p: PdcPlayer }) {
  const { data: src } = usePlayerPortrait(p.wiki_title);
  return (
    <div className="panel overflow-hidden border-primary/30">
      <div className="relative aspect-[4/5] bg-gradient-to-b from-primary/30 to-background">
        {src ? (
          <img src={src} alt={`${p.name} portrait`} loading="lazy" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl text-primary/60">
            {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
        )}
        {p.merit_ranking ? (
          <span className="absolute left-2 top-2 bg-primary px-2 py-0.5 font-display text-lg tabular-nums text-primary-foreground">
            #{p.merit_ranking}
          </span>
        ) : null}
        <span className="absolute right-2 top-2 text-2xl drop-shadow" role="img" aria-label={p.country_code ?? ""}>
          {playerFlag(p.country_code)}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-2 pt-8">
          <p className="truncate font-display text-xl leading-none">{p.name}</p>
          {p.nickname ? <p className="truncate text-xs font-semibold italic text-primary">"{p.nickname}"</p> : null}
        </div>
      </div>
    </div>
  );
}
