ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

DROP POLICY IF EXISTS "admins delete any message" ON public.messages;
CREATE POLICY "admins delete any message" ON public.messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "chat images readable by authenticated" ON storage.objects;
CREATE POLICY "chat images readable by authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat images insert own folder" ON storage.objects;
CREATE POLICY "chat images insert own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat images delete own or admin" ON storage.objects;
CREATE POLICY "chat images delete own or admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));