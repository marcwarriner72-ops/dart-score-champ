/** Pure parsing helpers for DataSportsAPI fixture results and statistics. */
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v);
  if (isObj(v)) return num(v["current"] ?? v["display"] ?? v["value"] ?? v["legs"]);
  return null;
};
const unwrap = (raw: unknown): Obj | null => (isObj(raw) ? (isObj(raw["data"]) ? raw["data"] : raw) : null);

export function parseFixtureResult(raw: unknown): { finished: boolean; home: number | null; away: number | null } {
  const f = unwrap(raw);
  if (!f) return { finished: false, home: null, away: null };
  const status = isObj(f["status"]) ? String(f["status"]["type"] ?? "") : String(f["status"] ?? "");
  const finished = /^(finished|ended|completed|ft)$/i.test(status);
  const home = num(f["player1_legs"] ?? f["homeScore"] ?? f["home_score"]);
  const away = num(f["player2_legs"] ?? f["awayScore"] ?? f["away_score"]);
  return { finished, home, away };
}

/** Find a statistic named like "180s"/"Thrown 180" and sum home+away. Returns null if not present. */
export function parse180s(raw: unknown): number | null {
  let found: number | null = null;
  const visit = (v: unknown) => {
    if (found !== null) return;
    if (Array.isArray(v)) return v.forEach(visit);
    if (!isObj(v)) return;
    const name = String(v["name"] ?? v["key"] ?? v["type"] ?? "");
    if (/180/.test(name)) {
      const h = num(v["home"] ?? v["homeValue"] ?? v["player1"]);
      const a = num(v["away"] ?? v["awayValue"] ?? v["player2"]);
      if (h !== null && a !== null) { found = h + a; return; }
    }
    for (const [k, val] of Object.entries(v)) {
      if (/^(?:thrown_?)?180s?$|^one_?eighties$/i.test(k) && isObj(val)) {
        const h = num(val["home"] ?? val["player1"]), a = num(val["away"] ?? val["player2"]);
        if (h !== null && a !== null) { found = h + a; return; }
      }
      visit(val);
    }
  };
  visit(raw);
  return found;
}
