CREATE OR REPLACE FUNCTION public.lock_started_matches()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.starts_at <= now() THEN
    IF NEW.player_a IS DISTINCT FROM OLD.player_a
       OR NEW.player_b IS DISTINCT FROM OLD.player_b
       OR NEW.tournament IS DISTINCT FROM OLD.tournament
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.format IS DISTINCT FROM OLD.format THEN
      RAISE EXCEPTION 'This fixture has already started and its details are locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_started_matches() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS matches_lock_after_start ON public.matches;
CREATE TRIGGER matches_lock_after_start
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.lock_started_matches();

DROP POLICY IF EXISTS "admins manage matches" ON public.matches;

CREATE POLICY "admins insert matches" ON public.matches
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update matches" ON public.matches
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete matches before start" ON public.matches
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND starts_at > now());