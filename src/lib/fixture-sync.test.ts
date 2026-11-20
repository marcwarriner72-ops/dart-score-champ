import { expect, test } from "vitest";
import { fixtureDates, fixtureKey, mapFixture } from "./fixture-sync";

const now = new Date("2026-11-20T20:35:00Z");
function event(overrides: Record<string, unknown> = {}) {
  return { id: 1174676, sport: "darts", startTime: "2026-11-21T19:15:00Z", status: { type: "notstarted" }, home: { name: "Gian Van Veen" }, away: { name: "Nathan Aspinall" }, league: { name: "Grand Slam of Darts" }, round: { name: "Quarterfinals" }, ...overrides };
}
test("maps player 1, player 2, date/time, tournament and round into existing fields", () => {
  expect(mapFixture(event(), ["Gian van Veen"], [], now)).toEqual({ player_a: "Gian van Veen", player_b: "Nathan Aspinall", starts_at: "2026-11-21T19:15:00.000Z", tournament: "Grand Slam of Darts", round: "Quarterfinals", format: "legs", country: "GB", session: "Evening", external_event_id: "datasportsapi:1174676" });
});
test("duplicate key uses UTC date plus both players, ignoring changed time and reversed sides", () => {
  const first = { player_a: "Gian van Veen", player_b: "Nathan Aspinall", starts_at: "2026-11-21T19:15:00Z" };
  expect(fixtureKey(first)).toBe(fixtureKey({ player_a: "NATHAN ASPINALL", player_b: "Gian van Veen", starts_at: "2026-11-21T21:00:00Z" }));
  expect(fixtureKey(first)).not.toBe(fixtureKey({ ...first, starts_at: "2026-11-22T19:15:00Z" }));
});
test("only imports upcoming PDC fixtures with two known participants", () => {
  expect(mapFixture(event({ league: { name: "Modus Super Series" } }), [], [], now)).toBeNull();
  expect(mapFixture(event({ status: { type: "finished" } }), [], [], now)).toBeNull();
  expect(mapFixture(event({ startTime: "2026-11-20T19:00:00Z" }), [], [], now)).toBeNull();
  expect(mapFixture(event({ away: null }), [], [], now)).toBeNull();
  expect(mapFixture(event({ away: { name: "TBC" } }), [], [], now)).toBeNull();
});
test("preserves existing tournament naming and sets scoring for World Championship", () => {
  const match = mapFixture(event({ league: { name: "World Championship" } }), [], ["World Darts Championship"], now);
  expect(match?.tournament).toBe("World Darts Championship");
  expect(match?.format).toBe("sets");
});
test("looks ahead seven UTC dates starting today", () => {
  expect(fixtureDates(now)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26"]);
});