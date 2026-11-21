/** Pure helpers for live in-play polling, rate-limit throttling and provisional points. */
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v);
  if (isObj(v)) return num(v["current"] ?? v["display"] ?? v["value"] ?? v["legs"]);
  return null;
};

export type LiveState = "live" | "finished" | "other";
export function parseLiveFixture(raw: unknown): { state: LiveState; home: number | null; away: number | null } {
  if (!isObj(raw)) return { state: "other", home: null, away: null };
  const s = isObj(raw["status"]) ? String(raw["status"]["type"] ?? raw["status"]["short"] ?? "") : String(raw["status"] ?? "");
  const state: LiveState = /^(finished|ended|completed|ft)$/i.test(s) ? "finished"
    : /^(live|inprogress|in_progress|in play|inplay|playing|started)$/i.test(s) ? "live" : "other";
  return {
    state,
    home: num(raw["player1_legs"] ?? raw["homeScore"] ?? raw["home_score"]),
    away: num(raw["player2_legs"] ?? raw["awayScore"] ?? raw["away_score"]),
  };
}

export type ThrottleMode = "normal" | "slow" | "paused";
/** Below 15 remaining → pause live polling; below 50 → slow to every 10 minutes. */
export function throttleMode(remaining: number | null): ThrottleMode {
  if (remaining === null) return "normal";
  if (remaining < 15) return "paused";
  if (remaining < 50) return "slow";
  return "normal";
}

/** Whether a run should poll now, given the mode and minutes since the last live poll. */
export function shouldPoll(mode: ThrottleMode, minutesSinceLast: number | null): boolean {
  if (mode === "paused") return false;
  if (mode === "slow") return minutesSinceLast === null || minutesSinceLast >= 9.5;
  return true;
}

/** Provisional points if the match ended at the current leg score (same 3/1/0 + 180s rules). */
export function provisionalPoints(
  live: { a: number; b: number },
  p: { predicted_winner: string; score_a: number | null; score_b: number | null },
): number {
  if (live.a === live.b) return 0;
  const leader = live.a > live.b ? "a" : "b";
  if (p.predicted_winner !== leader) return 0;
  return p.score_a === live.a && p.score_b === live.b ? 3 : 1;
}
