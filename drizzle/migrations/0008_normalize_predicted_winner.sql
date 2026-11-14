UPDATE public.predictions p SET predicted_winner = CASE WHEN p.predicted_winner = m.player_a THEN 'a' ELSE 'b' END
FROM public.matches m WHERE m.id = p.match_id AND p.predicted_winner NOT IN ('a','b') AND p.predicted_winner IN (m.player_a, m.player_b);
ALTER TABLE public.predictions ADD CONSTRAINT predictions_winner_ab CHECK (predicted_winner IN ('a','b')) NOT VALID;