import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FEED = "https://cswdarts.co.uk/darts-calendar.ics";

export interface IcsEvent {
  uid: string;
  summary: string;
  location: string | null;
  description: string | null;
  url: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
}

const unescape = (s: string) =>
  s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();

function parseDate(raw: string): { date: Date; allDay: boolean } {
  const v = raw.trim();
  if (/^\d{8}$/.test(v)) {
    return { date: new Date(Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8))), allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(v);
  if (!m) return { date: new Date(NaN), allDay: false };
  const n = m.slice(1).map(Number) as number[];
  return { date: new Date(Date.UTC(n[0]!, n[1]! - 1, n[2]!, n[3]!, n[4]!, n[5]!)), allDay: false };
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const out: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      if (cur["UID"] && cur["DTSTART"]) {
        const s = parseDate(cur["DTSTART"]);
        const e = cur["DTEND"] ? parseDate(cur["DTEND"]).date : null;
        if (!isNaN(s.date.getTime()))
          out.push({
            uid: cur["UID"],
            summary: unescape(cur["SUMMARY"] ?? ""),
            location: cur["LOCATION"] ? unescape(cur["LOCATION"]) : null,
            description: cur["DESCRIPTION"] ? unescape(cur["DESCRIPTION"]) : null,
            url: cur["URL"] ?? null,
            start: s.date,
            end: e && !isNaN(e.getTime()) ? e : null,
            allDay: s.allDay,
          });
      }
      cur = null;
    } else if (cur) {
      const i = line.indexOf(":");
      if (i > 0) cur[line.slice(0, i).split(";")[0] ?? ""] = line.slice(i + 1);
    }
  }
  return out;
}

/** "Grand Slam of Darts: Group stage, 7pm (Sky Sports)" -> tournament + round */
export function splitSummary(summary: string) {
  const noTv = summary.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const [tournament, rest] = noTv.split(/:\s*/, 2);
  const round = rest ? rest.replace(/,\s*\d{1,2}(:\d{2})?\s*(am|pm)\s*$/i, "").trim() : null;
  return { tournament: (tournament ?? "").trim(), round: round || null };
}

const SETS_EVENTS = ["world darts championship", "world championship", "world grand prix"];
export function formatFor(tournament: string, description: string | null): "legs" | "sets" {
  const m = /best of \d+ (legs|sets)/i.exec(description ?? "");
  if (m?.[1]) return m[1].toLowerCase() as "legs" | "sets";
  const t = tournament.toLowerCase();
  return SETS_EVENTS.some((s) => t.includes(s)) ? "sets" : "legs";
}

export function parseOrderOfPlay(description: string | null): [string, string][] {
  const m = /order of play:\s*(.+?)(?:\.\s+[A-Z]|\.?$)/i.exec(description ?? "");
  if (!m?.[1]) return [];
  return m[1]
    .split(";")
    .map((p) => p.trim().split(/\s+v\s+/))
    .filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1])
    .map(([a, b]) => [a.trim(), b.trim().replace(/\.$/, "")]);
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function countryFor(location: string | null): string | null {
  const l = (location ?? "").toLowerCase();
  const map: [string, string][] = [
    ["london", "GB"], ["wolverhampton", "GB"], ["minehead", "GB"], ["blackpool", "GB"], ["leicester", "GB"],
    ["amsterdam", "NL"], ["bahrain", "BH"], ["riyadh", "SA"], ["saudi", "SA"], ["new york", "US"],
    ["wellington", "NZ"], ["auckland", "NZ"], ["sydney", "AU"], ["wollongong", "AU"], ["copenhagen", "DK"],
    ["frankfurt", "DE"], ["dublin", "IE"], ["glasgow", "GB"], ["cardiff", "GB"], ["belfast", "GB"],
  ];
  return map.find(([k]) => l.includes(k))?.[1] ?? null;
}

export async function runDailySync(db: SupabaseClient<Database>, now = new Date()) {
  const res = await fetch(FEED, { headers: { Accept: "text/calendar", "User-Agent": "DartsPredictorLeague/1.0" } });
  if (!res.ok) throw new Error(`Calendar feed unavailable (${res.status})`);
  const events = parseIcs(await res.text());

  // 1. Calendar upsert (future + today)
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const rows = events
    .filter((e) => (e.end ?? e.start) >= todayStart)
    .map((e) => ({
      uid: e.uid,
      summary: e.summary,
      tournament: splitSummary(e.summary).tournament,
      location: e.location,
      description: e.description,
      url: e.url,
      starts_at: e.start.toISOString(),
      ends_at: e.end?.toISOString() ?? null,
      all_day: e.allDay,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length) {
    const { error } = await db.from("calendar_events").upsert(rows, { onConflict: "uid" });
    if (error) throw new Error(`Calendar upsert failed: ${error.message}`);
  }

  // 2. Today's fixtures
  const { data: roster } = await db.from("pdc_players").select("name");
  const byNorm = new Map((roster ?? []).map((p) => [norm(p.name), p.name]));
  const fix = (n: string) => byNorm.get(norm(n)) ?? n;

  const { data: existing } = await db
    .from("matches")
    .select("player_a, player_b")
    .gte("starts_at", todayStart.toISOString())
    .lt("starts_at", todayEnd.toISOString());
  const seen = new Set((existing ?? []).map((m) => [norm(m.player_a), norm(m.player_b)].sort().join("|")));

  const inserts: Database["public"]["Tables"]["matches"]["Insert"][] = [];
  const sessions = events.filter((e) => !e.allDay && e.start >= todayStart && e.start < todayEnd);
  for (const s of sessions) {
    const { tournament, round } = splitSummary(s.summary);
    const pairs = parseOrderOfPlay(s.description);
    const londonHour = Number(
      new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }).format(s.start),
    );
    const session = londonHour < 17 ? "Afternoon" : "Evening";
    pairs.forEach(([a, b], i) => {
      const pa = fix(a), pb = fix(b);
      const key = [norm(pa), norm(pb)].sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
      inserts.push({
        player_a: pa,
        player_b: pb,
        tournament,
        round,
        session,
        match_label: `Match ${i + 1}`,
        starts_at: new Date(s.start.getTime() + i * 25 * 60000).toISOString(),
        format: formatFor(tournament, s.description),
        country: countryFor(s.location),
      });
    });
  }
  if (inserts.length) {
    const { error } = await db.from("matches").insert(inserts);
    if (error) throw new Error(`Fixture insert failed: ${error.message}`);
  }
  return { calendarEvents: rows.length, todaySessions: sessions.length, fixturesAdded: inserts.length };
}
