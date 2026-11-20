CREATE OR REPLACE FUNCTION public.sync_darts_fixtures(p_fixtures jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  f jsonb;
  matches_ids uuid[];
  existing public.matches%ROWTYPE;
  start_at timestamptz;
  pair_a text;
  pair_b text;
  added integer := 0;
  changed integer := 0;
  unchanged integer := 0;
  skipped integer := 0;
BEGIN
  IF jsonb_typeof(p_fixtures) <> 'array' OR jsonb_array_length(p_fixtures) > 2000 THEN
    RAISE EXCEPTION 'Invalid fixture batch';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('sync-darts-fixtures', 0));
  FOR f IN SELECT value FROM jsonb_array_elements(p_fixtures) LOOP
    start_at := (f->>'starts_at')::timestamptz;
    pair_a := regexp_replace(lower(normalize(f->>'player_a', NFD)), '[^a-z0-9]', '', 'g');
    pair_b := regexp_replace(lower(normalize(f->>'player_b', NFD)), '[^a-z0-9]', '', 'g');
    IF start_at IS NULL OR start_at <= now() OR coalesce(pair_a, '') = '' OR coalesce(pair_b, '') = '' OR pair_a = pair_b THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;
    SELECT array_agg(m.id) INTO matches_ids FROM public.matches m
    WHERE m.external_event_id = f->>'external_event_id';
    IF coalesce(cardinality(matches_ids), 0) = 0 THEN
      SELECT array_agg(m.id) INTO matches_ids FROM public.matches m
      WHERE (m.starts_at AT TIME ZONE 'UTC')::date = (start_at AT TIME ZONE 'UTC')::date
        AND (
          (regexp_replace(lower(normalize(m.player_a, NFD)), '[^a-z0-9]', '', 'g') = pair_a AND regexp_replace(lower(normalize(m.player_b, NFD)), '[^a-z0-9]', '', 'g') = pair_b)
          OR
          (regexp_replace(lower(normalize(m.player_a, NFD)), '[^a-z0-9]', '', 'g') = pair_b AND regexp_replace(lower(normalize(m.player_b, NFD)), '[^a-z0-9]', '', 'g') = pair_a)
        );
    END IF;
    IF coalesce(cardinality(matches_ids), 0) > 1 THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;
    IF coalesce(cardinality(matches_ids), 0) = 1 THEN
      SELECT * INTO existing FROM public.matches WHERE id = matches_ids[1] FOR UPDATE;
      IF existing.archived OR existing.status <> 'upcoming' OR existing.score_a IS NOT NULL OR existing.score_b IS NOT NULL OR existing.starts_at <= now() THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      -- Do not relabel players: winner a/b and score orientation must remain valid.
      IF NOT (
        (regexp_replace(lower(normalize(existing.player_a, NFD)), '[^a-z0-9]', '', 'g') = pair_a AND regexp_replace(lower(normalize(existing.player_b, NFD)), '[^a-z0-9]', '', 'g') = pair_b)
        OR
        (regexp_replace(lower(normalize(existing.player_a, NFD)), '[^a-z0-9]', '', 'g') = pair_b AND regexp_replace(lower(normalize(existing.player_b, NFD)), '[^a-z0-9]', '', 'g') = pair_a)
      ) THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      UPDATE public.matches SET starts_at = start_at, external_event_id = coalesce(external_event_id, f->>'external_event_id') WHERE id = existing.id;
      IF existing.starts_at IS DISTINCT FROM start_at THEN changed := changed + 1;
      ELSE unchanged := unchanged + 1;
      END IF;
    ELSE
      INSERT INTO public.matches(player_a, player_b, tournament, round, starts_at, format, country, session, external_event_id)
      VALUES (f->>'player_a', f->>'player_b', f->>'tournament', f->>'round', start_at, coalesce(f->>'format', 'legs'), f->>'country', f->>'session', f->>'external_event_id');
      added := added + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('added', added, 'updated', changed, 'unchanged', unchanged, 'skipped', skipped);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_darts_fixtures(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_darts_fixtures(jsonb) TO service_role;