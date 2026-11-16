import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMatches, useProfiles } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Admin toggle: inactive players stay on historical tables but disappear from admin entry forms. */
export function ManagePlayers() {
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Player updated");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update player"),
  });
  return (
    <section className="panel mt-6 space-y-2 p-4">
      <h2 className="font-display text-xl font-bold uppercase">Manage players</h2>
      <p className="text-xs text-muted-foreground">Inactive players keep their history but are hidden from admin entry forms.</p>
      <ul className="space-y-2 pt-1">
        {profiles.map((p) => (
          <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2">
            <span className="truncate text-sm font-semibold">
              {p.display_name}
              <span className={`ml-2 text-[10px] font-bold uppercase ${p.is_active ? "text-primary" : "text-muted-foreground"}`}>
                {p.is_active ? "Active" : "Inactive"}
              </span>
            </span>
            <Button size="sm" variant={p.is_active ? "ghost" : "secondary"} disabled={toggle.isPending}
              onClick={() => toggle.mutate({ id: p.id, active: !p.is_active })}>
              {p.is_active ? "Deactivate" : "Activate"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Draft = { a: string; b: string; g: string };

/** Enter all of one player's missing picks for upcoming matches in one list. */
export function ProxyPredictions() {
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const { data: matches = [] } = useMatches();
  const active = profiles.filter((p) => p.is_active);
  const [userId, setUserId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const { data: picked = [] } = useQuery({
    queryKey: ["proxy-picks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("match_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.match_id);
    },
  });

  const open = useMemo(() => {
    const done = new Set(picked);
    const now = Date.now();
    return matches
      .filter((m) => m.status === "upcoming" && !m.archived && new Date(m.starts_at).getTime() > now && !done.has(m.id))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [matches, picked]);

  const save = useMutation({
    mutationFn: async (matchId: string) => {
      const d = drafts[matchId];
      if (!d || d.a === "" || d.b === "") throw new Error("Enter both scores");
      const a = Number(d.a), b = Number(d.b);
      if (a === b) throw new Error("A darts match can't end level");
      const { error } = await supabase.from("predictions").insert({
        match_id: matchId, user_id: userId, predicted_winner: a > b ? "a" : "b",
        score_a: a, score_b: b, guess_180s: d.g === "" ? null : Number(d.g),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prediction saved");
      qc.invalidateQueries({ queryKey: ["proxy-picks", userId] });
      qc.invalidateQueries({ queryKey: ["all-predictions"] });
      qc.invalidateQueries({ queryKey: ["predictions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const set = (id: string, k: keyof Draft, v: string) =>
    setDrafts((s) => ({ ...s, [id]: { a: "", b: "", g: "", ...s[id], [k]: v.replace(/\D/g, "") } }));

  return (
    <section className="panel mt-6 space-y-3 p-4">
      <h2 className="font-display text-xl font-bold uppercase">Admin prediction entry</h2>
      <Select value={userId} onValueChange={(v) => { setUserId(v); setDrafts({}); }}>
        <SelectTrigger className="h-10 w-full" aria-label="Choose player"><SelectValue placeholder="Choose a player" /></SelectTrigger>
        <SelectContent>
          {active.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
        </SelectContent>
      </Select>
      {userId && open.length === 0 && <p className="text-sm text-muted-foreground">No upcoming unpredicted matches.</p>}
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
        {userId && open.map((m) => {
          const d = drafts[m.id] ?? { a: "", b: "", g: "" };
          return (
            <li key={m.id} className="rounded-lg bg-secondary/40 p-2">
              <p className="truncate text-xs font-semibold">{m.player_a} vs {m.player_b}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(m.starts_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}{m.tournament ? ` · ${m.tournament}` : ""}</p>
              <div className="mt-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5">
                <Input inputMode="numeric" aria-label="Player 1 score" placeholder="P1" value={d.a} onChange={(e) => set(m.id, "a", e.target.value)} className="h-9 tabular-nums" />
                <Input inputMode="numeric" aria-label="Player 2 score" placeholder="P2" value={d.b} onChange={(e) => set(m.id, "b", e.target.value)} className="h-9 tabular-nums" />
                <Input inputMode="numeric" aria-label="180s" placeholder="180s" value={d.g} onChange={(e) => set(m.id, "g", e.target.value)} className="h-9 tabular-nums" />
                <Button size="sm" className="h-9" disabled={save.isPending} onClick={() => save.mutate(m.id)}>Save</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
