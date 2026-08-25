CREATE TABLE public.business_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  governorate_id uuid REFERENCES public.governorates(id),
  city_id uuid REFERENCES public.cities(id),
  address text,
  phone text,
  whatsapp text,
  latitude double precision,
  longitude double precision,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX business_branches_business_idx ON public.business_branches(business_id);
CREATE INDEX business_branches_city_idx ON public.business_branches(city_id);

GRANT SELECT ON public.business_branches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_branches TO authenticated;
GRANT ALL ON public.business_branches TO service_role;

ALTER TABLE public.business_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view branches of approved businesses"
  ON public.business_branches FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved'));

CREATE POLICY "Managers can view their branches"
  ON public.business_branches FOR SELECT TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert branches"
  ON public.business_branches FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update branches"
  ON public.business_branches FOR UPDATE TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can delete branches"
  ON public.business_branches FOR DELETE TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER business_branches_updated_at
  BEFORE UPDATE ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Denormalized location arrays used by city/governorate filtering.
ALTER TABLE public.businesses
  ADD COLUMN city_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN governorate_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX businesses_city_ids_idx ON public.businesses USING gin (city_ids);
CREATE INDEX businesses_governorate_ids_idx ON public.businesses USING gin (governorate_ids);

CREATE OR REPLACE FUNCTION public.refresh_business_locations(_business_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.businesses b
  SET city_ids = (
        SELECT COALESCE(array_agg(DISTINCT x), '{}')
        FROM (
          SELECT b.city_id AS x
          UNION
          SELECT br.city_id FROM public.business_branches br WHERE br.business_id = b.id
        ) s WHERE x IS NOT NULL
      ),
      governorate_ids = (
        SELECT COALESCE(array_agg(DISTINCT x), '{}')
        FROM (
          SELECT b.governorate_id AS x
          UNION
          SELECT br.governorate_id FROM public.business_branches br WHERE br.business_id = b.id
        ) s WHERE x IS NOT NULL
      )
  WHERE b.id = _business_id;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_business_locations(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_business_locations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'businesses' THEN
    NEW.city_ids := (
      SELECT COALESCE(array_agg(DISTINCT x), '{}') FROM (
        SELECT NEW.city_id AS x
        UNION SELECT br.city_id FROM public.business_branches br WHERE br.business_id = NEW.id
      ) s WHERE x IS NOT NULL);
    NEW.governorate_ids := (
      SELECT COALESCE(array_agg(DISTINCT x), '{}') FROM (
        SELECT NEW.governorate_id AS x
        UNION SELECT br.governorate_id FROM public.business_branches br WHERE br.business_id = NEW.id
      ) s WHERE x IS NOT NULL);
    RETURN NEW;
  END IF;

  PERFORM public.refresh_business_locations(COALESCE(NEW.business_id, OLD.business_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_business_locations() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER businesses_sync_locations
  BEFORE INSERT OR UPDATE OF city_id, governorate_id ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.sync_business_locations();

CREATE TRIGGER business_branches_sync_locations
  AFTER INSERT OR UPDATE OR DELETE ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.sync_business_locations();

UPDATE public.businesses
SET city_ids = CASE WHEN city_id IS NULL THEN '{}' ELSE ARRAY[city_id] END,
    governorate_ids = CASE WHEN governorate_id IS NULL THEN '{}' ELSE ARRAY[governorate_id] END;