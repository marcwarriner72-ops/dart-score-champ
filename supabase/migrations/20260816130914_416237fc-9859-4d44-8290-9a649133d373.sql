CREATE OR REPLACE VIEW public.tournament_leaderboard
WITH (security_invoker = true) AS
SELECT
  COALESCE(m.tournament, 'Other') AS tournament,
  pr.id AS user_id,
  pr.display_name,
  COALESCE(SUM(public.prediction_points(p.predicted_winner, p.score_a, p.score_b, m.score_a, m.score_b)), 0)::integer AS points,
  COUNT(p.id) FILTER (WHERE m.status = 'finished')::integer AS predictions_made,
  COUNT(p.id) FILTER (WHERE m.status = 'finished' AND public.prediction_points(p.predicted_winner, p.score_a, p.score_b, m.score_a, m.score_b) = 3)::integer AS exact_hits
FROM public.predictions p
JOIN public.matches m ON m.id = p.match_id
JOIN public.profiles pr ON pr.id = p.user_id
GROUP BY COALESCE(m.tournament, 'Other'), pr.id, pr.display_name;

GRANT SELECT ON public.tournament_leaderboard TO authenticated;

CREATE OR REPLACE VIEW public.tournaments
WITH (security_invoker = true) AS
SELECT
  COALESCE(m.tournament, 'Other') AS tournament,
  COUNT(*)::integer AS match_count,
  COUNT(*) FILTER (WHERE m.status = 'finished')::integer AS finished_count,
  MIN(m.starts_at) AS first_match_at,
  MAX(m.starts_at) AS last_match_at,
  (COUNT(*) FILTER (WHERE m.status <> 'finished') > 0) AS is_active
FROM public.matches m
GROUP BY COALESCE(m.tournament, 'Other');

GRANT SELECT ON public.tournaments TO authenticated;