DROP POLICY IF EXISTS "update own prediction" ON public.predictions;
CREATE POLICY "update own prediction" ON public.predictions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = predictions.match_id AND m.starts_at > now())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = predictions.match_id AND m.starts_at > now())
  );

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;