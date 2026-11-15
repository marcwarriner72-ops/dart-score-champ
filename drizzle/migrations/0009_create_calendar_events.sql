CREATE TABLE public.calendar_events (
  uid text PRIMARY KEY,
  summary text NOT NULL,
  tournament text,
  location text,
  description text,
  url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar readable" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE INDEX calendar_events_starts_idx ON public.calendar_events (starts_at);