DROP POLICY IF EXISTS "business images public read" ON storage.objects;
CREATE POLICY "business images owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'business-images' AND ((storage.foldername(name))[1] = (select auth.uid())::text OR public.has_role(auth.uid(), 'admin')));