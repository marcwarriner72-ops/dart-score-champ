import { expect, test } from "vitest";
import { parse180s, parseFixtureResult } from "./results-sync";
test("finished fixture yields leg scores", () => {
  expect(parseFixtureResult({ data: { status: { type: "finished" }, homeScore: { current: 10 }, awayScore: { current: 7 } } })).toEqual({ finished: true, home: 10, away: 7 });
});
test("180s summed from both players", () => {
  expect(parse180s({ data: [{ groups: [{ items: [{ name: "Thrown 180", home: "6", away: "4" }] }] }] })).toBe(10);
});
test("missing 180s returns null", () => { expect(parse180s({ data: [] })).toBeNull(); });
