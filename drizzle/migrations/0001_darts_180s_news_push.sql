ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS total_180s integer;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS guess_180s integer;

CREATE OR REPLACE FUNCTION public.bonus_180s(p_guess integer, m_total integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_guess IS NOT NULL AND m_total IS NOT NULL AND p_guess = m_total THEN 5 ELSE 0 END;
$$;

CREATE OR REPLACE VIEW public.tournament_leaderboard
WITH (security_invoker = true) AS
SELECT
  COALESCE(m.tournament, 'Other') AS tournament,
  pr.id AS user_id,
  pr.display_name,
  COALESCE(SUM(public.prediction_points(p.predicted_winner, p.score_a, p.score_b, m.score_a, m.score_b) + public.bonus_180s(p.guess_180s, m.total_180s)), 0)::integer AS points,
  COUNT(p.id) FILTER (WHERE m.status = 'finished')::integer AS predictions_made,
  COUNT(p.id) FILTER (WHERE m.status = 'finished' AND public.prediction_points(p.predicted_winner, p.score_a, p.score_b, m.score_a, m.score_b) = 3)::integer AS exact_hits
FROM public.predictions p
JOIN public.matches m ON m.id = p.match_id
JOIN public.profiles pr ON pr.id = p.user_id
GROUP BY COALESCE(m.tournament, 'Other'), pr.id, pr.display_name;

CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT pr.id AS user_id, pr.display_name,
  COALESCE(SUM(public.prediction_points(p.predicted_winner, p.score_a, p.score_b, m.score_a, m.score_b) + public.bonus_180s(p.guess_180s, m.total_180s)), 0)::integer AS points,
  COUNT(p.id) FILTER (WHERE m.status = 'finished')::integer AS predictions_made,
  COUNT(p.id) FILTER (WHERE m.status = 'finished' AND public.prediction_points(p.predicted_winner, p.score_a, p.score_b, m.score_a, m.score_b) = 3)::integer AS exact_hits
FROM public.profiles pr
LEFT JOIN public.predictions p ON p.user_id = pr.id
LEFT JOIN public.matches m ON m.id = p.match_id AND m.status = 'finished'
GROUP BY pr.id, pr.display_name;

CREATE TABLE public.news_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.news_updates TO authenticated;
GRANT ALL ON public.news_updates TO service_role;
ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news readable" ON public.news_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert news" ON public.news_updates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete news" ON public.news_updates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.push_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.push_alerts TO authenticated;
GRANT ALL ON public.push_alerts TO service_role;
ALTER TABLE public.push_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts readable" ON public.push_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins send alerts" ON public.push_alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.push_opt_ins (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.push_opt_ins TO authenticated;
GRANT ALL ON public.push_opt_ins TO service_role;
ALTER TABLE public.push_opt_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own opt-in read" ON public.push_opt_ins FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own opt-in insert" ON public.push_opt_ins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own opt-in update" ON public.push_opt_ins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);