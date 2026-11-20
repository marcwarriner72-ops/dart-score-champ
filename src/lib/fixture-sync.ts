import { z } from "zod";

export const FIXTURE_LOOKAHEAD_DAYS = 7;
const named = z.object({ name: z.string().max(200) });
const fixtureSchema = z.object({
  id: z.number().int().positive(),
  sport: z.literal("darts"),
  startTime: z.string().datetime({ offset: true }),
  status: z.object({ type: z.string() }),
  home: named.nullable(),
  away: named.nullable(),
  league: named,
  round: named.nullable().optional(),
});
export const fixturePageSchema = z.object({
  data: z.array(z.unknown()).max(2000),
  meta: z.object({ hasNextPage: z.boolean(), complete: z.boolean().optional() }),
});

export type SyncFixture = {
  player_a: string; player_b: string; tournament: string; round: string | null;
  starts_at: string; format: "legs" | "sets"; country: string | null;
  session: string; external_event_id: string;
};

export const playerKey = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function fixtureKey(f: Pick<SyncFixture, "player_a" | "player_b" | "starts_at">) {
  return `${new Date(f.starts_at).toISOString().slice(0, 10)}|${[playerKey(f.player_a), playerKey(f.player_b)].sort().join("|")}`;
}

// Include PDC competitions only; never import MODUS or WDF tournaments.
const competitions: [RegExp, string, string | null][] = [
  [/^(?:pdc )?grand slam(?: of darts)?$/i, "Grand Slam of Darts", "GB"],
  [/^(?:pdc )?world (?:darts )?championship$/i, "World Darts Championship", "GB"],
  [/^(?:pdc )?world grand prix$/i, "World Grand Prix", "GB"],
  [/^(?:pdc )?premier league(?: darts| of darts)?$/i, "Premier League Darts", null],
  [/^(?:pdc )?world matchplay$/i, "World Matchplay", "GB"],
  [/^(?:pdc )?uk open$/i, "UK Open", "GB"],
  [/^(?:pdc )?players championship finals$/i, "Players Championship Finals", "GB"],
  [/^(?:pdc )?european championship$/i, "European Championship", "DE"],
  [/^(?:pdc )?world cup of darts$/i, "World Cup of Darts", "DE"],
  [/^(?:pdc )?world series of darts finals$/i, "World Series of Darts Finals", "NL"],
  [/^(?:pdc )?bahrain darts masters$/i, "Bahrain Darts Masters", "BH"],
  [/^(?:pdc )?saudi arabia darts masters$/i, "Saudi Arabia Darts Masters", "SA"],
  [/^(?:pdc )?nordic darts masters$/i, "Nordic Darts Masters", "DK"],
  [/^(?:pdc )?us darts masters$/i, "US Darts Masters", "US"],
  [/^(?:pdc )?new zealand darts masters$/i, "New Zealand Darts Masters", "NZ"],
  [/^(?:pdc )?australian darts masters$/i, "Australian Darts Masters", "AU"],
];

export function mapFixture(raw: unknown, roster: string[], tournaments: string[], now = new Date()): SyncFixture | null {
  const parsed = fixtureSchema.safeParse(raw);
  if (!parsed.success) return null;
  const f = parsed.data;
  if (f.status.type !== "notstarted" || new Date(f.startTime) <= now || !f.home || !f.away) return null;
  const competition = competitions.find(([pattern]) => pattern.test(f.league.name.trim()));
  if (!competition) return null;
  const resolve = (value: string) => roster.find((n) => playerKey(n) === playerKey(value)) ?? value.trim();
  const a = resolve(f.home.name), b = resolve(f.away.name);
  if (!a || !b || /^(?:tbc|tbd|unknown|winner\b)/i.test(a) || /^(?:tbc|tbd|unknown|winner\b)/i.test(b) || playerKey(a) === playerKey(b)) return null;
  const tournament = tournaments.find((name) => competition[0].test(name.trim())) ?? competition[1];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(new Date(f.startTime)));
  return { player_a: a, player_b: b, tournament, round: f.round?.name ?? null,
    starts_at: new Date(f.startTime).toISOString(), format: /world (?:darts )?championship|world grand prix/i.test(tournament) ? "sets" : "legs",
    country: competition[2], session: hour < 17 ? "Afternoon" : "Evening", external_event_id: `datasportsapi:${f.id}` };
}

export function fixtureDates(now: Date) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: FIXTURE_LOOKAHEAD_DAYS }, (_, i) => new Date(midnight + i * 86400000).toISOString().slice(0, 10));
}