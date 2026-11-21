import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { playerKey } from "./fixture-sync";
import { parse180s } from "./results-sync";
import { parseLiveFixture, shouldPoll, throttleMode } from "./live-sync";

const BASE = "https://api.datasportsapi.com/v2";

export async function syncLiveDarts(db: SupabaseClient<Database>) {
  const nowIso = new Date().toISOString();
  const { data: active, error } = await db.from("matches")
    .select("id, player_a, player_b, starts_at, external_event_id, status")
    .lte("starts_at", nowIso).neq("status", "finished").eq("archived", false).limit(60);
  if (error) throw new Error("Could not read fixtures");
  if (!active?.length) return { skipped: "no active matches", calls: 0 };

  const today = nowIso.slice(0, 10);
  const { data: logs } = await db.from("api_usage_log").select("logged_at, rate_limit_remaining, job, calls")
    .gte("logged_at", `${today}T00:00:00Z`).order("logged_at", { ascending: false }).limit(50);
  const lastKnown = logs?.find((l) => l.rate_limit_remaining !== null)?.rate_limit_remaining ?? null;
  const mode = throttleMode(lastKnown);
  const lastLive = logs?.find((l) => l.job === "live" && l.calls > 0);
  const mins = lastLive ? (Date.now() - new Date(lastLive.logged_at).getTime()) / 60000 : null;
  if (!shouldPoll(mode, mins)) return { skipped: `throttled (${mode})`, calls: 0, rate_limit_remaining: lastKnown };

  const key = process.env["DARTS_API_KEY"];
  if (!key) throw new Error("DataSportsAPI is not connected.");
  let remaining: number | null = lastKnown, calls = 0;
  const get = async (path: string) => {
    calls++;
    const r = await fetch(BASE + path, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
    const rl = r.headers.get("RateLimit-Remaining") ?? r.headers.get("X-RateLimit-Remaining");
    if (rl && /^\d+$/.test(rl)) remaining = Number(rl);
    if (!r.ok) throw new Error(`DataSportsAPI HTTP ${r.status}`);
    return r.json() as Promise<unknown>;
  };

  let live = 0, finished = 0;
  try {
    const res = await get(`/fixtures?sport=darts&date=${today}`) as { data?: unknown[] };
    const feed = Array.isArray(res?.data) ? res.data : [];
    for (const m of active) {
      const a = playerKey(m.player_a), b = playerKey(m.player_b);
      const linked = m.external_event_id?.startsWith("datasportsapi:") ? m.external_event_id.slice(14) : null;
      let hit: { id: string; swapped: boolean; raw: unknown } | null = null;
      for (const f of feed) {
        const o = f as { id?: number; home?: { name?: string }; away?: { name?: string } };
        const h = playerKey(o.home?.name ?? ""), w = playerKey(o.away?.name ?? "");
        if ((linked && String(o.id) === linked) || (h === a && w === b)) { hit = { id: String(o.id), swapped: false, raw: f }; break; }
        if (h === b && w === a) { hit = { id: String(o.id), swapped: true, raw: f }; break; }
      }
      if (!hit) continue;
      const s = parseLiveFixture(hit.raw);
      if (s.home === null || s.away === null) continue;
      const [sa, sb] = hit.swapped ? [s.away, s.home] : [s.home, s.away];
      const ext = m.external_event_id ?? `datasportsapi:${hit.id}`;
      if (s.state === "live") {
        await db.from("matches").update({ status: "live", live_a: sa, live_b: sb, external_event_id: ext }).eq("id", m.id).neq("status", "finished");
        live++;
      } else if (s.state === "finished" && sa !== sb) {
        // Final 180s only fetched once on completion.
        let t180: number | null = null;
        try { t180 = parse180s(await get(`/fixtures/${hit.id}/statistics`)); } catch { /* keep score, 180s left for results job/admin */ }
        await db.from("matches").update({ status: "finished", score_a: sa, score_b: sb, live_a: sa, live_b: sb, external_event_id: ext, ...(t180 !== null ? { total_180s: t180 } : {}) })
          .eq("id", m.id).neq("status", "finished");
        finished++;
      }
    }
  } finally {
    await db.from("api_usage_log").insert({ job: "live", calls, rate_limit_remaining: remaining, mode });
  }
  return { calls, live, finished, mode, rate_limit_remaining: remaining };
}
