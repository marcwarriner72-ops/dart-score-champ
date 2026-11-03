import { useRef, useState } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { guessCountry } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLUMNS = ["player_a", "player_b", "tournament", "host_country", "scored_in", "starts_at"] as const;
const SAMPLE =
  "player_a,player_b,tournament,host_country,scored_in,starts_at\nLuke Littler,Luke Humphries,Premier League,GB,legs,2026-02-05 19:00\n";

type Status = { ok: boolean; messages: string[] } | null;

/** External header names -> our column names. Headers are normalised (lowercase, single spaces). */
const HEADER_MAP: Record<string, string> = {
  "player 1": "player_a", player_1: "player_a", "player a": "player_a", player_a: "player_a", player1: "player_a",
  "player 2": "player_b", player_2: "player_b", "player b": "player_b", player_b: "player_b", player2: "player_b",
  "scheduled start time": "starts_at", "start time": "starts_at", starts_at: "starts_at", datetime: "starts_at",
  date: "date", time: "time",
  tournament: "tournament", round: "tournament", competition: "tournament",
  host_country: "host_country", "host country": "host_country", country: "host_country",
  scored_in: "scored_in", "scored in": "scored_in", format: "scored_in",
};

const COUNTRY_NAMES: Record<string, string> = {
  "united kingdom": "GB", uk: "GB", england: "GB", scotland: "GB", wales: "GB", ireland: "IE",
  netherlands: "NL", germany: "DE", belgium: "BE", denmark: "DK", sweden: "SE", austria: "AT",
  "united states": "US", usa: "US", australia: "AU", "new zealand": "NZ", bahrain: "BH", "saudi arabia": "SA",
};

function toCountry(v: string | undefined) {
  const s = (v ?? "").trim();
  if (!s) return "GB"; // default: United Kingdom
  if (s.length === 2) return s.toUpperCase();
  return COUNTRY_NAMES[s.toLowerCase()] ?? guessCountry(s) ?? "GB";
}

type Row = Partial<Record<"player_a"|"player_b"|"starts_at"|"date"|"time"|"tournament"|"host_country"|"scored_in", string>>;

function toDate(row: Row) {
  let raw = (row.starts_at ?? "").trim();
  const d = (row.date ?? "").trim();
  const t = (row.time ?? "").trim();
  if (!raw) raw = d && t ? `${d} ${t}` : d || t;
  if (!raw) return null;
  // dd/mm/yyyy [hh:mm] -> yyyy-mm-dd hh:mm
  const uk = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(.*)$/);
  if (uk) raw = `${uk[3]}-${uk[2]!.padStart(2, "0")}-${uk[1]!.padStart(2, "0")}${uk[4]}`;
  let when = new Date(raw.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T"));
  if (isNaN(when.getTime())) when = new Date(raw);
  return isNaN(when.getTime()) ? null : when;
}

export function parseFixtureCsv(text: string) {
  const res = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => {
      const k = h.trim().toLowerCase().replace(/\s+/g, " ");
      return HEADER_MAP[k] ?? k;
    },
  });
  const errors: string[] = [];
  const rows: {
    player_a: string;
    player_b: string;
    tournament: string | null;
    country: string;
    format: string;
    starts_at: string;
  }[] = [];
  res.data.forEach((r, i) => {
    const line = i + 2;
    const a = r.player_a?.trim();
    const b = r.player_b?.trim();
    if (!a && !b) return; // blank-ish row, skip quietly
    const when = toDate(r);
    if (!a || !b || !when) {
      errors.push(`Row ${line} skipped: needs both players and a start date`);
      return;
    }
    const fmtRaw = (r.scored_in ?? "").trim().toLowerCase();
    const tournament = r.tournament?.trim() || null;
    rows.push({
      player_a: a,
      player_b: b,
      tournament,
      country: toCountry(r.host_country),
      format: fmtRaw.startsWith("leg") ? "legs" : "sets", // default: Sets
      starts_at: when.toISOString(),
    });
  });
  if (!rows.length) errors.push("No fixtures found — check the file has player and date columns");
  return { rows, errors };
}

export function CsvBulkUpload() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus(null);
    try {
      const { rows, errors } = parseFixtureCsv(await file.text());
      if (!rows.length) {
        setStatus({ ok: false, messages: errors.slice(0, 8) });
        return;
      }
      const { error } = await supabase.from("matches").insert(rows);
      if (error) throw error;
      setStatus({
        ok: true,
        messages: [
          `Successfully loaded ${rows.length} fixture${rows.length === 1 ? "" : "s"} into the table`,
          ...errors.slice(0, 5),
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    } catch (e) {
      setStatus({ ok: false, messages: [e instanceof Error ? e.message : "Upload failed"] });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="panel mt-4 space-y-3 p-4">
      <h2 className="font-display text-xl font-bold uppercase">Bulk Upload via CSV</h2>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-center transition-colors",
          drag && "border-primary bg-primary/15",
        )}
      >
        {busy ? <Loader2 className="size-8 animate-spin text-primary" /> : <FileUp className="size-8 text-primary" />}
        <span className="text-sm font-semibold">{busy ? "Importing…" : "Drop a CSV here or tap to choose"}</span>
        <span className="text-xs text-muted-foreground">Columns: {COLUMNS.join(", ")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`} download="fixtures-template.csv">
          Download a template CSV
        </a>
      </Button>
      {status && (
        <div
          role="status"
          className={cn(
            "flex gap-2 rounded-lg border p-3 text-sm",
            status.ok ? "border-primary/50 bg-primary/10" : "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          {status.ok ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : <XCircle className="size-4 shrink-0" />}
          <ul className="space-y-1">
            {status.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
