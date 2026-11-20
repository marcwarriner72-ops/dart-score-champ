CREATE OR REPLACE FUNCTION public.fill_match_tournament()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.tournament IS NULL OR btrim(NEW.tournament) = '' OR NEW.tournament = 'Other' THEN
    SELECT m.tournament, coalesce(NEW.country, m.country) INTO NEW.tournament, NEW.country
    FROM public.matches m
    WHERE m.id <> NEW.id AND m.tournament IS NOT NULL AND btrim(m.tournament) <> '' AND m.tournament <> 'Other'
      AND m.starts_at BETWEEN NEW.starts_at - interval '3 days' AND NEW.starts_at + interval '3 days'
    ORDER BY abs(extract(epoch FROM (m.starts_at - NEW.starts_at)))
    LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.fill_match_tournament() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS matches_fill_tournament ON public.matches;
CREATE TRIGGER matches_fill_tournament BEFORE INSERT OR UPDATE OF tournament, starts_at ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.fill_match_tournament();
UPDATE public.matches SET tournament = 'Grand Slam of Darts', country = coalesce(country, 'GB')
WHERE tournament IS NULL AND starts_at >= '2026-11-14' AND starts_at < '2026-11-23';