CREATE TABLE public.results_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  checked integer NOT NULL DEFAULT 0,
  graded integer NOT NULL DEFAULT 0,
  rate_limit_remaining integer,
  message text,
  raw_stats_sample jsonb
);
GRANT SELECT ON public.results_sync_runs TO authenticated;
GRANT ALL ON public.results_sync_runs TO service_role;
ALTER TABLE public.results_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read sync runs" ON public.results_sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));