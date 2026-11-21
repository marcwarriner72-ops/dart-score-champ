ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS live_a integer, ADD COLUMN IF NOT EXISTS live_b integer;
CREATE TABLE public.api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at timestamptz NOT NULL DEFAULT now(),
  job text NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  rate_limit_remaining integer,
  mode text
);
GRANT SELECT ON public.api_usage_log TO authenticated;
GRANT ALL ON public.api_usage_log TO service_role;
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read api usage" ON public.api_usage_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;