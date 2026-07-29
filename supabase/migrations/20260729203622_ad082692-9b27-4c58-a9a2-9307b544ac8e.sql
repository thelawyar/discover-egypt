DROP POLICY IF EXISTS "categories suggest insert" ON public.categories;
CREATE POLICY "categories suggest insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (suggested_by = auth.uid() AND status = 'pending')
  );

REVOKE EXECUTE ON FUNCTION public.enforce_category_moderation() FROM anon, authenticated, public;