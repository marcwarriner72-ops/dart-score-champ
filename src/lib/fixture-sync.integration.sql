-- Run with the privileged database query tool; every test row is rolled back.
BEGIN;
DO $$
DECLARE
  fixture_id uuid;
  pick_id uuid;
  test_user uuid;
  counts jsonb;
  start_at timestamptz := '2099-11-21T19:15:00Z';
BEGIN
  SELECT id INTO test_user FROM public.profiles LIMIT 1;
  IF test_user IS NULL THEN RAISE EXCEPTION 'A profile is required for prediction preservation testing'; END IF;
  INSERT INTO public.matches(player_a, player_b, tournament, starts_at)
  VALUES ('Fixture Sync Test Alpha', 'Fixture Sync Test Beta', 'Sync Test', start_at)
  RETURNING id INTO fixture_id;
  INSERT INTO public.predictions(match_id, user_id, predicted_winner, score_a, score_b, guess_180s)
  VALUES (fixture_id, test_user, 'a', 5, 3, 10) RETURNING id INTO pick_id;

  -- Same date and players, reversed API sides and changed start time: update, not insert.
  counts := public.sync_darts_fixtures(jsonb_build_array(jsonb_build_object(
    'player_a', 'Fixture Sync Test Beta', 'player_b', 'Fixture Sync Test Alpha',
    'tournament', 'Provider Rename', 'starts_at', '2099-11-21T21:00:00Z',
    'external_event_id', 'fixture-sync-test:alpha-beta')));
  IF counts->>'added' <> '0' OR counts->>'updated' <> '1' THEN RAISE EXCEPTION 'Date/player duplicate check failed: %', counts; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = fixture_id AND player_a = 'Fixture Sync Test Alpha' AND player_b = 'Fixture Sync Test Beta' AND tournament = 'Sync Test' AND starts_at = '2099-11-21T21:00:00Z') THEN
    RAISE EXCEPTION 'Existing fixture identity and sides must be preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.predictions WHERE id = pick_id AND match_id = fixture_id AND predicted_winner = 'a' AND score_a = 5 AND score_b = 3 AND guess_180s = 10) THEN
    RAISE EXCEPTION 'Saved prediction was overwritten';
  END IF;
  -- A provider reference follows a reschedule to another UTC date without duplication.
  counts := public.sync_darts_fixtures(jsonb_build_array(jsonb_build_object(
    'player_a', 'Fixture Sync Test Alpha', 'player_b', 'Fixture Sync Test Beta',
    'starts_at', '2099-11-22T19:00:00Z', 'external_event_id', 'fixture-sync-test:alpha-beta')));
  IF counts->>'added' <> '0' OR counts->>'updated' <> '1' THEN RAISE EXCEPTION 'Cross-date reschedule failed'; END IF;
  -- Identical second refresh is idempotent.
  counts := public.sync_darts_fixtures(jsonb_build_array(jsonb_build_object(
    'player_a', 'Fixture Sync Test Alpha', 'player_b', 'Fixture Sync Test Beta',
    'starts_at', '2099-11-22T19:00:00Z', 'external_event_id', 'fixture-sync-test:alpha-beta')));
  IF counts->>'added' <> '0' OR counts->>'updated' <> '0' OR counts->>'unchanged' <> '1' THEN RAISE EXCEPTION 'Repeated refresh duplicated a fixture'; END IF;
  UPDATE public.matches SET score_a = 5, score_b = 3, status = 'finished' WHERE id = fixture_id;
  counts := public.sync_darts_fixtures(jsonb_build_array(jsonb_build_object(
    'player_a', 'Fixture Sync Test Alpha', 'player_b', 'Fixture Sync Test Beta',
    'starts_at', '2099-11-22T21:00:00Z', 'external_event_id', 'fixture-sync-test:alpha-beta')));
  IF counts->>'skipped' <> '1' OR NOT EXISTS (SELECT 1 FROM public.matches WHERE id = fixture_id AND score_a = 5 AND score_b = 3 AND status = 'finished' AND starts_at = '2099-11-22T19:00:00Z') THEN
    RAISE EXCEPTION 'Finished results were modified';
  END IF;
  IF has_function_privilege('authenticated', 'public.sync_darts_fixtures(jsonb)', 'EXECUTE') OR has_function_privilege('anon', 'public.sync_darts_fixtures(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Fixture RPC must be privileged only';
  END IF;
END;
$$;
ROLLBACK;