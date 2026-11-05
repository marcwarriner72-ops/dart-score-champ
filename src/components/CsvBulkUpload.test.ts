import { test, expect } from "vitest";
import { parseFixtureCsv } from "./CsvBulkUpload";
test("maps the official CSV columns", () => {
  const r = parseFixtureCsv(
    "Date,Session,Scheduled Start Time,Round,Match Label,Player 1,Player 2\n2026-11-20,Evening,19:30,Quarter-Final,QF 1,Luke Littler,Michael Smith\n",
    { tournament: "World Series of Darts Finals", format: "legs" },
  );
  expect(r.rows[0]).toMatchObject({
    player_a: "Luke Littler", player_b: "Michael Smith", tournament: "World Series of Darts Finals",
    session: "Evening", round: "Quarter-Final", match_label: "QF 1", format: "legs",
  });
  expect(r.rows[0]?.starts_at).toContain("2026-11-20");
});
