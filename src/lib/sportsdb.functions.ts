import { createServerFn } from "@tanstack/react-start";
import { PDC_EVENTS, nextPdcEvent } from "@/lib/league";

/** A single upcoming darts competition, ready for the countdown UI. */
export type LiveEvent = {
  name: string;
  startsAt: string;
  country: string | null;
  venue: string | null;
  /** "live" = straight from TheSportsDB, "fallback" = built-in calendar. */
  source: "live" | "fallback";
};

type SportsDbEvent = {
  strEvent?: string | null;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strVenue?: string | null;
  strCountry?: string | null;
};

/** Country names as TheSportsDB spells them -> ISO-2 code for the flag emoji. */
const COUNTRY_CODES: Record<string, string> = {
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  ireland: "IE",
  "republic of ireland": "IE",
  netherlands: "NL",
  "the netherlands": "NL",
  holland: "NL",
  germany: "DE",
  belgium: "BE",
  denmark: "DK",
  sweden: "SE",
  norway: "NO",
  finland: "FI",
  austria: "AT",
  switzerland: "CH",
  gibraltar: "GI",
  hungary: "HU",
  czechia: "CZ",
  "czech republic": "CZ",
  poland: "PL",
  bahrain: "BH",
  "saudi arabia": "SA",
  qatar: "QA",
  "united arab emirates": "AE",
  "usa": "US",
  "united states": "US",
  canada: "CA",
  australia: "AU",
  "new zealand": "NZ",
  japan: "JP",
  philippines: "PH",
  "south africa": "ZA",
};

function countryCode(name: string | null | undefined): string | null {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return null;
  return COUNTRY_CODES[key] ?? null;
}

/** Build an ISO start time from the timestamp, or the date + time fields. */
function startTime(event: SportsDbEvent): string | null {
  const stamp = event.strTimestamp?.trim();
  if (stamp) {
    const iso = stamp.endsWith("Z") ? stamp : `${stamp.replace(" ", "T")}Z`;
    if (!Number.isNaN(new Date(iso).getTime())) return iso;
  }
  const date = event.dateEvent?.trim();
  if (!date) return null;
  const time = event.strTime?.trim() || "00:00:00";
  const iso = `${date}T${time.length === 5 ? `${time}:00` : time}Z`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
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
 * Next upcoming PDC darts event from TheSportsDB (free key `123` in the URL path).
 * Falls back to the built-in PDC calendar when the feed is empty or unreachable.
 */
export const getNextDartsEvent = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveEvent | null> => {
    const key = process.env["THESPORTSDB_API_KEY"] ?? "123";
    const base = `https://www.thesportsdb.com/api/v1/json/${key}`;

    const get = async <T>(path: string): Promise<T | null> => {
      try {
        const res = await fetch(`${base}${path}`, { headers: { accept: "application/json" } });
        if (!res.ok) {
          console.error(`TheSportsDB ${path} failed: ${res.status}`);
          return null;
        }
        return (await res.json()) as T;
      } catch (error) {
        console.error(`TheSportsDB ${path} error`, error);
        return null;
      }
    };

    try {
      // 1. Find the PDC darts league (falls back to the known id if the search misses).
      const leagues = await get<{
        countries?: { idLeague?: string; strLeague?: string; strCurrentSeason?: string }[];
      }>("/search_all_leagues.php?s=Darts");
      const pdc =
        (leagues?.countries ?? []).find((l) => /pdc/i.test(l.strLeague ?? "")) ?? null;
      const leagueId = pdc?.idLeague ?? "4554";

      // 2. Upcoming events, with the season list as a second source.
      let events =
        (await get<{ events?: SportsDbEvent[] | null }>(`/eventsnextleague.php?id=${leagueId}`))
          ?.events ?? [];

      if (!events.length) {
        const season = pdc?.strCurrentSeason ?? String(new Date().getUTCFullYear());
        events =
          (
            await get<{ events?: SportsDbEvent[] | null }>(
              `/eventsseason.php?id=${leagueId}&s=${season}`,
            )
          )?.events ?? [];
      }

      const now = Date.now();
      const upcoming = events
        .map((e): LiveEvent | null => {
          const startsAt = startTime(e);
          const name = (e.strEvent ?? "").trim();
          if (!startsAt || !name) return null;
          return {
            name,
            startsAt,
            country: countryCode(e.strCountry),
            venue: e.strVenue?.trim() || null,
            source: "live",
          };
        })
        .filter((e): e is LiveEvent => e !== null && new Date(e.startsAt).getTime() > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

      if (!upcoming.length) return fallbackEvent();

      // Prefer a World Grand Prix within the next two months, otherwise the closest event.
      const window = now + 60 * 24 * 60 * 60 * 1000;
      const grandPrix = upcoming.find(
        (e) => /world grand prix/i.test(e.name) && new Date(e.startsAt).getTime() <= window,
      );

      return grandPrix ?? upcoming[0] ?? fallbackEvent();
    } catch (error) {
      console.error("TheSportsDB darts schedule fetch failed", error);
      return fallbackEvent();
    }
  },
);
