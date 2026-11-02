import { useRef, useState } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { guessCountry } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLUMNS = ["player_a", "player_b", "tournament", "host_country", "scored_in", "starts_at"] as const;
const REQUIRED = ["player_a", "player_b", "starts_at"];
const SAMPLE =
  "player_a,player_b,tournament,host_country,scored_in,starts_at\nLuke Littler,Luke Humphries,Premier League,GB,legs,2026-02-05 19:00\n";

type Status = { ok: boolean; messages: string[] } | null;

export function parseFixtureCsv(text: string) {
  const res = Papa.parse<Partial<Record<(typeof COLUMNS)[number], string>>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const errors: string[] = [];
  const headers = res.meta.fields ?? [];
  const unknown = headers.filter((h) => !(COLUMNS as readonly string[]).includes(h));
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (unknown.length) errors.push(`Unknown column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} (expected ${COLUMNS.join(", ")})`);
  if (missing.length) errors.push(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  if (errors.length) return { rows: [], errors };

  const rows = res.data.map((r, i) => {
    const line = i + 2;
    const a = r.player_a?.trim();
    const b = r.player_b?.trim();
    const when = new Date((r.starts_at ?? "").trim().replace(" ", "T"));
    const fmt = (r.scored_in ?? "").trim().toLowerCase() || "legs";
    const tournament = r.tournament?.trim() || null;
    if (!a || !b) errors.push(`Row ${line}: player_a and player_b are required`);
    if (isNaN(when.getTime())) errors.push(`Row ${line}: starts_at "${r.starts_at ?? ""}" isn't a valid date`);
    if (fmt !== "legs" && fmt !== "sets") errors.push(`Row ${line}: scored_in must be "legs" or "sets"`);
    return {
      player_a: a ?? "",
      player_b: b ?? "",
      tournament,
      country: r.host_country?.trim().toUpperCase() || guessCountry(tournament ?? "") || "GB",
      format: fmt,
      starts_at: isNaN(when.getTime()) ? "" : when.toISOString(),
    };
  });
  if (!rows.length) errors.push("The file has no fixture rows");
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
      if (errors.length) {
        setStatus({ ok: false, messages: errors.slice(0, 8) });
        return;
      }
      const { error } = await supabase.from("matches").insert(rows);
      if (error) throw error;
      setStatus({ ok: true, messages: [`Successfully loaded ${rows.length} fixture${rows.length === 1 ? "" : "s"} into the table`] });
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
