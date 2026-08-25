-- Storage objects in business-images are always written under the uploader's
-- own auth.uid() folder. Harden update/delete so a user can only mutate objects
-- that they both own (storage owner) and that live in their own folder.
DROP POLICY IF EXISTS "business images owner update" ON storage.objects;
DROP POLICY IF EXISTS "business images owner delete" ON storage.objects;
DROP POLICY IF EXISTS "business images owner upload" ON storage.objects;

CREATE POLICY "business images owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND owner = auth.uid()
);

CREATE POLICY "business images owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'business-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND owner = auth.uid()
);

CREATE POLICY "business images owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND owner = auth.uid()
);
