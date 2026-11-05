import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ICAL from "ical.js";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { fetchPdcIcs } from "@/lib/pdc-calendar.functions";

export const Route = createFileRoute("/_authenticated/pdc-calendar")({
  head: () => ({
    meta: [
      { title: "PDC Calendar · Darts Predictor League" },
      { name: "description", content: "Live monthly calendar of every PDC tournament and televised session." },
      { property: "og:title", content: "PDC Calendar · Darts Predictor League" },
      { property: "og:description", content: "Live monthly calendar of every PDC tournament and televised session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PdcCalendarPage,
});

type CalEvent = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  durationLabel: string;
};

function parseIcs(text: string): CalEvent[] {
  const comp = new ICAL.Component(ICAL.parse(text));
  return comp.getAllSubcomponents("vevent").map((v) => {
    const e = new ICAL.Event(v);
    const allDay = e.startDate.isDate;
    const start = e.startDate.toJSDate();
    const end = e.endDate ? e.endDate.toJSDate() : start;
    const d = e.duration;
    const durationLabel = d
      ? [d.weeks ? `${d.weeks}w` : "", d.days ? `${d.days}d` : "", d.hours ? `${d.hours}h` : "", d.minutes ? `${d.minutes}m` : ""]
          .filter(Boolean)
          .join(" ")
      : "";
    return {
      uid: e.uid,
      summary: e.summary ?? "Darts",
      description: e.description ?? "",
      location: e.location ?? "",
      start,
      end,
      allDay,
      durationLabel,
    };
  });
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function PdcCalendarPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pdc-ics"],
    queryFn: async () => parseIcs((await fetchPdcIcs()).ics),
    staleTime: 1000 * 60 * 60,
  });
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of data ?? []) {
      // All-day events end exclusively at midnight; spread over every day they cover.
      const last = ev.allDay ? new Date(ev.end.getTime() - 1) : ev.end;
      const d = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate());
      for (let i = 0; d <= last && i < 60; i++, d.setDate(d.getDate() + 1)) {
        const k = dayKey(d);
        map.set(k, [...(map.get(k) ?? []), ev]);
      }
    }
    return map;
  }, [data]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= daysInMonth ? new Date(year, month, day) : null;
  });
  const todayKey = dayKey(new Date());
  const monthEvents = (data ?? [])
    .filter((e) => e.start <= new Date(year, month + 1, 0, 23, 59) && e.end >= new Date(year, month, 1))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const listed = selected ? byDay.get(dayKey(selected)) ?? [] : monthEvents;

  return (
    <AppShell title="PDC Calendar" subtitle="Live tour schedule · updates automatically">
      <div className="panel p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => { setSelected(null); setCursor(new Date(year, month - 1, 1)); }}>
            <ChevronLeft />
          </Button>
          <p className="font-display text-2xl uppercase">
            {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => { setSelected(null); setCursor(new Date(year, month + 1, 1)); }}>
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const evs = byDay.get(dayKey(d)) ?? [];
            const isSel = selected && dayKey(selected) === dayKey(d);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(isSel ? null : d)}
                className={`flex aspect-square flex-col items-center justify-start border p-1 text-xs tabular-nums transition-colors ${
                  isSel ? "border-primary bg-primary/20" : evs.length ? "border-primary/40 bg-primary/10" : "border-border"
                } ${dayKey(d) === todayKey ? "ring-1 ring-accent" : ""}`}
              >
                <span className="font-bold">{d.getDate()}</span>
                {evs.length ? (
                  <span className="mt-auto flex gap-0.5">
                    {evs.slice(0, 3).map((e) => <span key={e.uid} className="size-1.5 rounded-full bg-primary" />)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="mb-2 mt-5 font-display text-xl uppercase">
        {selected ? selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "This month"}
      </h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading the tour schedule…</p> : null}
      {error ? <p className="text-sm text-destructive">Couldn't load the calendar right now. Try again shortly.</p> : null}
      {!isLoading && !error && listed.length === 0 ? <p className="text-sm text-muted-foreground">No darts scheduled.</p> : null}
      <div className="space-y-2 pb-4">
        {listed.map((e) => (
          <div key={e.uid} className="panel border-l-4 border-l-primary p-3">
            <p className="font-bold">{e.summary}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {e.allDay
                  ? `${e.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(e.end.getTime() - 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : e.start.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {e.durationLabel ? ` · ${e.durationLabel}` : ""}
              </span>
              {e.location ? <span className="flex items-center gap-1"><MapPin className="size-3" />{e.location}</span> : null}
            </p>
            {e.description ? <p className="mt-2 text-xs text-muted-foreground">{e.description}</p> : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
