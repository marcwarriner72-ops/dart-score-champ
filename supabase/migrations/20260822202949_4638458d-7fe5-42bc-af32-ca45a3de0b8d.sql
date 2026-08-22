ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favourite_player text,
  ADD COLUMN IF NOT EXISTS hometown text,
  ADD COLUMN IF NOT EXISTS walk_on_song text,
  ADD COLUMN IF NOT EXISTS highest_checkout integer,
  ADD COLUMN IF NOT EXISTS bio text;

CREATE OR REPLACE FUNCTION public.lock_started_matches()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.starts_at <= now() AND NOT public.has_role(auth.uid(), 'admin') THEN
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
$function$;

DROP POLICY IF EXISTS "admins delete matches before start" ON public.matches;
CREATE POLICY "admins delete matches"
ON public.matches FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));