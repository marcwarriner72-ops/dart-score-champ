import { createServerFn } from "@tanstack/react-start";

/** Proxies the public cswdarts.co.uk iCal feed (the site sends no CORS headers, so browsers can't read it directly). */
export const fetchPdcIcs = createServerFn({ method: "GET" }).handler(async () => {
  const res = await fetch("https://cswdarts.co.uk/darts-calendar.ics", {
    headers: { Accept: "text/calendar" },
  });
  if (!res.ok) throw new Error(`Calendar feed unavailable (${res.status})`);
  return { ics: await res.text() };
});
