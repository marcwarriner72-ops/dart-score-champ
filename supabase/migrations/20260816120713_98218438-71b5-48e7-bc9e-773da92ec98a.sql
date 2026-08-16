-- Predictions: gate on start time instead of match status
DROP POLICY IF EXISTS "insert own prediction" ON public.predictions;
DROP POLICY IF EXISTS "update own prediction" ON public.predictions;
DROP POLICY IF EXISTS "read others after finish" ON public.predictions;

CREATE POLICY "insert own prediction" ON public.predictions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.starts_at > now())
);

CREATE POLICY "update own prediction" ON public.predictions
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.starts_at > now())
)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read others after start" ON public.predictions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.starts_at <= now()));

-- Admins can manage roles
CREATE POLICY "admins insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

GRANT INSERT, DELETE ON public.user_roles TO authenticated;