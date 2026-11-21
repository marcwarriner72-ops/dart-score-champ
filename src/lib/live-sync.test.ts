import { describe, expect, it } from "vitest";
import { parseLiveFixture, provisionalPoints, shouldPoll, throttleMode } from "./live-sync";

describe("rate-limit guard", () => {
  it("slows below 50 remaining", () => expect(throttleMode(49)).toBe("slow"));
  it("pauses below 15 remaining", () => expect(throttleMode(14)).toBe("paused"));
  it("runs normally at 50", () => expect(throttleMode(50)).toBe("normal"));
  it("slow mode waits 10 minutes", () => {
    expect(shouldPoll("slow", 6)).toBe(false);
    expect(shouldPoll("slow", 10)).toBe(true);
  });
  it("paused never polls live", () => expect(shouldPoll("paused", 60)).toBe(false));
});

describe("provisional points", () => {
  const pick = { predicted_winner: "a", score_a: 11, score_b: 9 };
  it("3 for exact current score", () => expect(provisionalPoints({ a: 11, b: 9 }, pick)).toBe(3));
  it("1 for leading winner only", () => expect(provisionalPoints({ a: 8, b: 5 }, pick)).toBe(1));
  it("0 when trailing", () => expect(provisionalPoints({ a: 5, b: 8 }, pick)).toBe(0));
  it("0 when level", () => expect(provisionalPoints({ a: 5, b: 5 }, pick)).toBe(0));
});

describe("parseLiveFixture", () => {
  it("reads live legs", () =>
    expect(parseLiveFixture({ status: "inprogress", player1_legs: 11, player2_legs: 9 })).toEqual({ state: "live", home: 11, away: 9 }));
});
