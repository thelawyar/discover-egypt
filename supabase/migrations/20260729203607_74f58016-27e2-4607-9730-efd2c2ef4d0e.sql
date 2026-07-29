ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS status public.business_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS suggested_by uuid;

UPDATE public.categories SET status = 'approved' WHERE status <> 'approved';

GRANT SELECT, INSERT ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_category_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := public.make_slug(NEW.name);
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.suggested_by := auth.uid();
  IF TG_OP = 'UPDATE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_moderation ON public.categories;
CREATE TRIGGER categories_moderation
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_moderation();

DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read approved" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "categories admin read all" ON public.categories
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "categories suggest insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "categories own suggestion read" ON public.categories
  FOR SELECT TO authenticated
  USING (suggested_by = auth.uid());