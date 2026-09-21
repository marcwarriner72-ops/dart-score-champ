import { createServerFn } from "@tanstack/react-start";
import { PDC_EVENTS, nextPdcEvent } from "@/lib/league";

/** A single upcoming darts competition, ready for the countdown UI. */
export type LiveEvent = {
  name: string;
  startsAt: string;
  country: string | null;
  venue: string | null;
  /** "live" = straight from the schedule feed, "fallback" = built-in calendar. */
  source: "live" | "fallback";
};

type Json = Record<string, unknown>;

function asArray(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Pull a two-letter country code out of any of the shapes the feed uses. */
function countryOf(node: Json | undefined): string | null {
  if (!node) return null;
  const direct =
    str(node["country_code"]) ??
    str((node["venue"] as Json | undefined)?.["country_code"]) ??
    str((node["category"] as Json | undefined)?.["country_code"]) ??
    str((node["sport_event_context"] as Json | undefined)?.["category"] as unknown) ??
    null;
  if (!direct) return null;
  // Sportradar often uses 3-letter IOC codes; map the darts-relevant ones to ISO-2.
  const ioc: Record<string, string> = {
    ENG: "GB",
    GBR: "GB",
    SCO: "GB",
    WAL: "GB",
    NIR: "GB",
    IRL: "IE",
    NED: "NL",
    NLD: "NL",
    GER: "DE",
    DEU: "DE",
    BEL: "BE",
    DEN: "DK",
    DNK: "DK",
    SWE: "SE",
    AUT: "AT",
    GIB: "GI",
    HUN: "HU",
    CZE: "CZ",
    POL: "PL",
    BHR: "BH",
    SAU: "SA",
    UAE: "AE",
    USA: "US",
    CAN: "CA",
    AUS: "AU",
    NZL: "NZ",
    JPN: "JP",
    PHI: "PH",
    RSA: "ZA",
  };
  const upper = direct.toUpperCase();
  if (upper.length === 2) return upper;
  return ioc[upper] ?? null;
}

function venueOf(node: Json | undefined): string | null {
  const venue = node?.["venue"] as Json | undefined;
  if (!venue) return null;
  const name = str(venue["name"]);
  const city = str(venue["city_name"]);
  return [name, city].filter(Boolean).join(", ") || null;
}

/** The built-in calendar entry, used whenever the live feed is unavailable. */
function fallbackEvent(): LiveEvent | null {
  const event = nextPdcEvent() ?? PDC_EVENTS[0] ?? null;
  if (!event) return null;
  return {
    name: event.name,
    startsAt: event.startsAt,
    country: event.country,
    venue: null,
    source: "fallback",
  };
}

/**
 * Fetches the next upcoming darts competition from the Sportradar Darts feed.
 * Falls back to the built-in PDC calendar when the key is missing or the feed errors.
 */
export const getNextDartsEvent = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveEvent | null> => {
    const apiKey = process.env["SPORTRADAR_API_KEY"];
    if (!apiKey) return fallbackEvent();

    const accessLevel = process.env["SPORTRADAR_ACCESS_LEVEL"] ?? "trial";
    const base = `https://api.sportradar.com/darts/${accessLevel}/v2/en`;

    const get = async (path: string): Promise<Json | null> => {
      const res = await fetch(`${base}${path}`, {
        method: "GET",
        headers: { "x-api-key": apiKey, accept: "application/json" },
      });
      if (!res.ok) {
        console.error(`Sportradar ${path} failed: ${res.status}`);
        return null;
      }
      return (await res.json()) as Json;
    };

    try {
      const now = Date.now();

      // 1. Competitions, so we can locate the PDC events (World Grand Prix first).
      const competitions = asArray((await get("/competitions.json"))?.["competitions"]);
      if (!competitions.length) return fallbackEvent();

      const scored = competitions
        .map((c) => {
          const name = str(c["name"]) ?? "";
          const lower = name.toLowerCase();
          const priority = lower.includes("world grand prix") ? 0 : 1;
          return { id: str(c["id"]), name, priority, node: c };
        })
        .filter((c) => c.id && c.name)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 6);

      const candidates: LiveEvent[] = [];

      for (const comp of scored) {
        // 2. Current/next season for this competition, then its schedule.
        const seasons = asArray((await get(`/competitions/${comp.id}/seasons.json`))?.["seasons"]);
        const season =
          seasons
            .slice()
            .sort((a, b) => String(a["start_date"]).localeCompare(String(b["start_date"])))
            .find((s) => new Date(String(s["end_date"] ?? s["start_date"])).getTime() > now) ??
          seasons[seasons.length - 1];
        if (!season?.["id"]) continue;

        const schedule = await get(`/seasons/${String(season["id"])}/schedules.json`);
        const events = asArray(schedule?.["schedules"]).concat(
          asArray(schedule?.["sport_events"]),
        );

        for (const raw of events) {
          const event = (raw["sport_event"] as Json | undefined) ?? raw;
          const startsAt = str(event["start_time"]) ?? str(event["scheduled"]);
          if (!startsAt || new Date(startsAt).getTime() <= now) continue;
          const context = event["sport_event_context"] as Json | undefined;
          candidates.push({
            name: str((context?.["competition"] as Json | undefined)?.["name"]) ?? comp.name,
            startsAt,
            country:
              countryOf(event) ??
              countryOf(context?.["category"] as Json | undefined) ??
              countryOf(comp.node) ??
              null,
            venue: venueOf(event),
            source: "live",
          });
          break; // earliest future event per competition is enough
        }

        // World Grand Prix found with a future date — that is the target.
        if (comp.priority === 0 && candidates.length) break;
      }

      if (!candidates.length) return fallbackEvent();

      return candidates.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? fallbackEvent();
    } catch (error) {
      console.error("Sportradar darts schedule fetch failed", error);
      return fallbackEvent();
    }
  },
);
