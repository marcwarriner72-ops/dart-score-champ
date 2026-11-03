import { test, expect } from "vitest";
import { parseFixtureCsv } from "./CsvBulkUpload";
test("maps", () => {
  const r = parseFixtureCsv("Player 1,Player 2,Round,Date,Time\nLuke Littler,Michael Smith,Final,2026-11-20,19:30\n");
  expect(r.rows[0]).toMatchObject({ player_a: "Luke Littler", player_b: "Michael Smith", tournament: "Final", country: "GB", format: "sets" });
  expect(r.rows[0].starts_at).toContain("2026-11-20");
});
