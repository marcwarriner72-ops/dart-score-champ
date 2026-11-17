import { expect, test } from "vitest";
import { todayPredictionRows } from "./TodaySummary";
import type { Match, Prediction } from "@/lib/league";

const now = new Date(2026, 10, 17, 20);
function fixture(id: string, day: number, hour: number, scored = false): Match {
  return { id, player_a: "Luke Littler", player_b: "Michael Smith", tournament: "Grand Slam", starts_at: new Date(2026, 10, day, hour).toISOString(), status: scored ? "completed" : "upcoming", score_a: scored ? 5 : null, score_b: scored ? 2 : null };
}
function pick(match_id: string): Prediction {
  return { id: match_id, match_id, user_id: "me", predicted_winner: "a", score_a: 5, score_b: 2, guess_180s: 10 };
}
test("reveals only saved predictions for today's local date, in start order", () => {
  const rows = todayPredictionRows([fixture("late", 17, 21), fixture("yesterday", 16, 19), fixture("early", 17, 19), fixture("unpredicted", 17, 18)], [pick("late"), pick("yesterday"), pick("early")], now);
  expect(rows.map((r) => r.match.id)).toEqual(["early", "late"]);
});
test("fades only past completed matches, not underway or future matches", () => {
  const rows = todayPredictionRows([fixture("done", 17, 18, true), fixture("underway", 17, 19), fixture("future", 17, 21, true)], [pick("done"), pick("underway"), pick("future")], now);
  expect(rows.map((r) => [r.match.id, r.completed])).toEqual([["done", true], ["underway", false], ["future", false]]);
});