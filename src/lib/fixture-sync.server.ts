import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { fixtureDates, fixtureKey, fixturePageSchema, mapFixture, type SyncFixture } from "./fixture-sync";

const resultSchema = z.object({ added: z.number(), updated: z.number(), unchanged: z.number(), skipped: z.number() });

export async function syncDartsFixtures(db: SupabaseClient<Database>, now = new Date()) {
  const key = process.env['DARTS_API_KEY'];
  if (!key) throw new Error("DataSportsAPI is not connected. Save DARTS_API_KEY securely first.");
  const [players, matches] = await Promise.all([
    db.from("pdc_players").select("name"),
    db.from("matches").select("tournament"),
  ]);
  if (players.error || matches.error) throw new Error("Could not read existing fixture names. No fixtures were changed.");
  const roster = (players.data ?? []).map((p) => p.name);
  const tournaments = [...new Set((matches.data ?? []).flatMap((m) => m.tournament ? [m.tournament] : []))];
  const batches = await Promise.all(fixtureDates(now).map(async (date) => {
    const raw: unknown[] = [];
    for (let page = 0; page < 100; page++) {
      const url = new URL("https://api.datasportsapi.com/v2/fixtures");
      url.searchParams.set("sport", "darts");
      url.searchParams.set("date", date);
      url.searchParams.set("page", String(page));
      const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "User-Agent": "DartsPredictorLeague/1.0" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        // Never expose provider response bodies: they can echo credentials.
        const reason = response.status === 401 ? "Check your saved API key." : response.status === 429 ? "Your provider request limit was reached; try again later." : "The provider could not supply fixtures; try again later.";
        throw new Error(`DataSportsAPI returned HTTP ${response.status}. ${reason} No fixtures were changed.`);
      }
      const parsed = fixturePageSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.meta.complete === false) throw new Error("DataSportsAPI returned incomplete fixture data. No fixtures were changed.");
      raw.push(...parsed.data.data);
      if (!parsed.data.meta.hasNextPage) return raw;
    }
    throw new Error("DataSportsAPI exceeded its documented pagination limit. No fixtures were changed.");
  }));
  const fixtures = new Map<string, SyncFixture>();
  let ignored = 0;
  for (const raw of batches.flat()) {
    const mapped = mapFixture(raw, roster, tournaments, now);
    if (!mapped) { ignored++; continue; }
    fixtures.set(fixtureKey(mapped), mapped);
  }
  const { data, error } = await db.rpc("sync_darts_fixtures", { p_fixtures: [...fixtures.values()].map((f) => ({ ...f })) });
  if (error) throw new Error("Could not save fixture updates. The fixture transaction was rolled back.");
  return { ...resultSchema.parse(data), ignored, checked: batches.flat().length, days: fixtureDates(now).length };
}