import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { playerKey } from "./fixture-sync";
import { parse180s, parseFixtureResult } from "./results-sync";

const BASE = "https://api.datasportsapi.com/v2";

export async function syncDartsResults(db: SupabaseClient<Database>) {
  const key = process.env["DARTS_API_KEY"];
  if (!key) throw new Error("DataSportsAPI is not connected.");
  let remaining: number | null = null;
  const get = async (path: string) => {
    const r = await fetch(BASE + path, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
    const rl = r.headers.get("RateLimit-Remaining") ?? r.headers.get("X-RateLimit-Remaining");
    if (rl && /^\d+$/.test(rl)) remaining = Number(rl);
    if (!r.ok) throw new Error(`DataSportsAPI HTTP ${r.status}`);
    return r.json() as Promise<unknown>;
  };

  const { data: pending, error } = await db.from("matches")
    .select("id, player_a, player_b, starts_at, external_event_id")
    .lte("starts_at", new Date().toISOString()).neq("status", "finished").eq("archived", false).limit(40);
  if (error) throw new Error("Could not read fixtures");

  const { count: priorRuns } = await db.from("results_sync_runs").select("id", { count: "exact", head: true }).not("raw_stats_sample", "is", null);
  let sample: unknown = null;
  const dayCache = new Map<string, unknown[]>();
  let graded = 0;
  const errors: string[] = [];

  for (const m of pending ?? []) {
    try {
      let id = m.external_event_id?.startsWith("datasportsapi:") ? m.external_event_id.slice(14) : null;
      let swapped = false;
      if (!id) {
        const day = m.starts_at.slice(0, 10);
        if (!dayCache.has(day)) {
          const res = await get(`/fixtures?sport=darts&date=${day}`) as { data?: unknown[] };
          dayCache.set(day, Array.isArray(res?.data) ? res.data : []);
        }
        const a = playerKey(m.player_a), b = playerKey(m.player_b);
        for (const f of dayCache.get(day)!) {
          const o = f as { id?: number; home?: { name?: string }; away?: { name?: string } };
          const h = playerKey(o.home?.name ?? ""), w = playerKey(o.away?.name ?? "");
          if (h === a && w === b) { id = String(o.id); break; }
          if (h === b && w === a) { id = String(o.id); swapped = true; break; }
        }
        if (!id) continue;
      }
      const result = parseFixtureResult(await get(`/fixtures/${id}`));
      if (!result.finished || result.home === null || result.away === null || result.home === result.away) continue;
      const stats = await get(`/fixtures/${id}/statistics`);
      if (!sample) { sample = stats; if (!priorRuns) console.log("DataSportsAPI statistics sample", JSON.stringify(stats).slice(0, 4000)); }
      const t180 = parse180s(stats);
      const [sa, sb] = swapped ? [result.away, result.home] : [result.home, result.away];
      const { error: upErr } = await db.from("matches").update({
        score_a: sa, score_b: sb, status: "finished", ...(t180 !== null ? { total_180s: t180 } : {}),
        external_event_id: m.external_event_id ?? `datasportsapi:${id}`,
      }).eq("id", m.id).neq("status", "finished");
      if (upErr) throw upErr;
      graded++;
    } catch (e) { errors.push(e instanceof Error ? e.message : "error"); if (/HTTP 429/.test(String(e))) break; }
  }
  const summary = { checked: pending?.length ?? 0, graded, rate_limit_remaining: remaining, message: errors.length ? `${errors.length} lookups failed (${errors[0]})` : null };
  await db.from("results_sync_runs").insert({ ...summary, raw_stats_sample: (sample ?? null) as never });
  return summary;
}
