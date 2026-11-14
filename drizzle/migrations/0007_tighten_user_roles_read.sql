DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "read own or admin roles" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR role = 'admin'::app_role OR public.has_role(auth.uid(), 'admin'::app_role));