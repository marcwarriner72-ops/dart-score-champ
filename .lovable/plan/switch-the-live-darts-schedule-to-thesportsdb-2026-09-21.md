# Switch the live darts schedule to TheSportsDB

Replace the Sportradar lookup with TheSportsDB's free API (test key `123` in the URL path), so the dashboard countdown needs no paid key and no stored secret.

## What changes for you

- No API key to buy or paste — the free test key is public and safe to keep in the code.
- When no fixtures of your own are scheduled, the dashboard counts down to the next real PDC event pulled live from TheSportsDB, showing its name, date, venue and host-country flag.
- If the free feed is unavailable or returns nothing upcoming, the countdown quietly falls back to the built-in PDC calendar exactly as it does today, so the page never breaks.

## How it works

1. Look up the PDC darts league on TheSportsDB (`search_all_leagues.php?s=Darts`, matching the PDC entry; its league id is used for the next call), then request its upcoming events (`eventsnextleague.php?id=<leagueId>`), with a season-events lookup (`eventsseason.php`) as a secondary source when the "next events" list is empty.
2. Pick the earliest event whose start is still in the future, preferring a World Grand Prix entry when one falls within the same window.
3. Derive the host country from the event's country/venue fields, mapped to the two-letter code the existing flag component expects; fall back to guessing from the event name (already supported) when the payload has no country.
4. Feed name, start date/time, venue and country into the existing countdown panel — no visual redesign.

## Technical notes

- Rewrite `src/lib/sportradar.functions.ts` as `src/lib/sportsdb.functions.ts`, keeping the same `createServerFn({ method: "GET" })` shape and the `LiveEvent` return type (`name`, `startsAt`, `country`, `venue`, `source`), so the component contract is unchanged. Delete the Sportradar file.
- Base URL `https://www.thesportsdb.com/api/v1/json/123/`, key read from an optional `THESPORTSDB_API_KEY` env var with `123` as the default, so a paid key can be dropped in later without code changes.
- Combine `dateEvent` + `strTime` (or `strTimestamp` when present) into an ISO start time; treat `strCountry`/`strVenue` as the location source.
- `SPORTRADAR_API_KEY` is never requested — no secret form, nothing stored.
- Update the import and `queryKey` in `src/components/NextFixtureCountdown.tsx`; the existing fallback to `PDC_EVENTS` in `src/lib/league.ts` stays as the safety net.
