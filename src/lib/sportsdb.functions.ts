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

/** Finished-event scores keyed by TheSportsDB idEvent, for the admin "Fetch Latest Results" sync. */
export type PastScore = { idEvent: string; home: number; away: number };

export const getPastDartsScores = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[] }) => ({
    ids: (input.ids ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 200),
  }))
  .handler(async ({ data }): Promise<PastScore[]> => {
    const key = process.env["THESPORTSDB_API_KEY"] ?? "123";
    const base = `https://www.thesportsdb.com/api/v1/json/${key}`;
    type Ev = { idEvent?: string | null; intHomeScore?: string | null; intAwayScore?: string | null };
    const found = new Map<string, Ev>();
    try {
      const res = await fetch(`${base}/eventspastleague.php?id=4554`);
      if (res.ok) {
        const json = (await res.json()) as { events?: Ev[] | null };
        for (const e of json.events ?? []) if (e.idEvent) found.set(String(e.idEvent), e);
      }
    } catch (error) {
      console.error("TheSportsDB past events failed", error);
    }
    // Look up any saved IDs the past-league list didn't include.
    for (const id of data.ids.filter((i) => !found.has(i))) {
      try {
        const res = await fetch(`${base}/lookupevent.php?id=${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const json = (await res.json()) as { events?: Ev[] | null };
        const e = json.events?.[0];
        if (e?.idEvent) found.set(String(e.idEvent), e);
      } catch {
        /* skip */
      }
    }
    const out: PastScore[] = [];
    for (const id of data.ids) {
      const e = found.get(id);
      if (!e || e.intHomeScore == null || e.intAwayScore == null) continue;
      const home = Number(e.intHomeScore);
      const away = Number(e.intAwayScore);
      if (Number.isFinite(home) && Number.isFinite(away)) out.push({ idEvent: id, home, away });
    }
    return out;
  });

/** An upcoming online fixture for the admin "Search Online Fixtures" lookup. */
export type OnlineFixture = {
  idEvent: string;
  title: string;
  playerA: string;
  playerB: string;
  tournament: string;
  startsAt: string;
  country: string | null;
};

export const getUpcomingSportsDbFixtures = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId?: string } | undefined) => ({
    leagueId: /^\d+$/.test(input?.leagueId ?? "") ? input!.leagueId! : "4554",
  }))
  .handler(async ({ data }): Promise<OnlineFixture[]> => {
    const key = process.env["THESPORTSDB_API_KEY"] ?? "123";
    const base = `https://www.thesportsdb.com/api/v1/json/${key}`;
    type Ev = SportsDbEvent & {
      idEvent?: string | null;
      strHomeTeam?: string | null;
      strAwayTeam?: string | null;
    };
    const get = async (path: string): Promise<Ev[]> => {
      try {
        const res = await fetch(`${base}${path}`);
        if (!res.ok) return [];
        const json = (await res.json()) as { events?: Ev[] | null };
        return json.events ?? [];
      } catch {
        return [];
      }
    };
    const y = new Date().getUTCFullYear() || 2026;
    let events = await get(`/eventsseason.php?id=${data.leagueId}&s=${y}`);
    if (!events.length && y !== 2026) {
      events = await get(`/eventsseason.php?id=${data.leagueId}&s=2026`);
    }
    const today = Date.now();
    const scored = new Set<string>();
    const seen = new Set<string>();
    const out: OnlineFixture[] = [];
    for (const e of events) {
      const id = e.idEvent ? String(e.idEvent) : "";
      const startsAt = startTime(e);
      const title = (e.strEvent ?? "").trim();
      if (!id || !startsAt || !title || seen.has(id)) continue;
      seen.add(id);
      const raw = e as Record<string, unknown>;
      if (raw["intHomeScore"] != null && raw["intAwayScore"] != null) scored.add(id);
      let a = (e.strHomeTeam ?? "").trim();
      let b = (e.strAwayTeam ?? "").trim();
      if (!a || !b) {
        const m = title.match(/^(.+?)\s+(?:vs?\.?|v)\s+(.+)$/i);
        if (m) {
          a = m[1]!.trim();
          b = m[2]!.trim();
        }
      }
      const tournament = title
        .replace(/\s+(day|night|round)\s+\d+$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      out.push({
        idEvent: id,
        title,
        playerA: a,
        playerB: b,
        tournament: a && b ? "" : tournament,
        startsAt,
        country: countryCode(e.strCountry),
      });
    }
    const dist = (f: OnlineFixture) => Math.abs(new Date(f.startsAt).getTime() - today);
    return out
      .sort(
        (a, b) =>
          Number(scored.has(a.idEvent)) - Number(scored.has(b.idEvent)) || dist(a) - dist(b),
      )
      .slice(0, 200);
  });
