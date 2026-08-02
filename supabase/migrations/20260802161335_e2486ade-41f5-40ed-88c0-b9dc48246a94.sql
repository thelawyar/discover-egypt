-- ========== EVENTS / OFFERS ==========
CREATE TYPE public.event_kind AS ENUM ('offer', 'party', 'opening', 'match', 'event');

CREATE TABLE public.business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  city_id uuid REFERENCES public.cities(id),
  governorate_id uuid REFERENCES public.governorates(id),
  kind public.event_kind NOT NULL DEFAULT 'event',
  title text NOT NULL,
  description text,
  image_url text,
  venue text,
  external_url text,
  price_info text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX business_events_starts_idx ON public.business_events (starts_at DESC);
CREATE INDEX business_events_city_idx ON public.business_events (city_id);
CREATE INDEX business_events_business_idx ON public.business_events (business_id);

GRANT SELECT ON public.business_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_events TO authenticated;
GRANT ALL ON public.business_events TO service_role;

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published events of approved businesses"
ON public.business_events FOR SELECT
USING (
  is_published = true
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved')
);

CREATE POLICY "Managers can read their events"
ON public.business_events FOR SELECT TO authenticated
USING (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "Managers can insert events"
ON public.business_events FOR INSERT TO authenticated
WITH CHECK (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "Managers can update events"
ON public.business_events FOR UPDATE TO authenticated
USING (public.can_manage_business(business_id, auth.uid()))
WITH CHECK (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "Managers can delete events"
ON public.business_events FOR DELETE TO authenticated
USING (public.can_manage_business(business_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_event_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT b.city_id, b.governorate_id INTO NEW.city_id, NEW.governorate_id
  FROM public.businesses b WHERE b.id = NEW.business_id;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_featured := coalesce((SELECT e.is_featured FROM public.business_events e WHERE e.id = NEW.id), false);
  END IF;
  NEW.created_by := coalesce(NEW.created_by, auth.uid());
  RETURN NEW;
END; $$;

CREATE TRIGGER business_events_sync
BEFORE INSERT OR UPDATE ON public.business_events
FOR EACH ROW EXECUTE FUNCTION public.sync_event_location();

CREATE TRIGGER business_events_updated_at
BEFORE UPDATE ON public.business_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== USER LISTS ==========
CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  city_id uuid REFERENCES public.cities(id),
  cover_image_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lists TO authenticated;
GRANT ALL ON public.lists TO service_role;

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public lists are readable" ON public.lists FOR SELECT USING (is_public = true);
CREATE POLICY "Owners read own lists" ON public.lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert lists" ON public.lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update lists" ON public.lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete lists" ON public.lists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage lists" ON public.lists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lists_updated_at
BEFORE UPDATE ON public.lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, business_id)
);

CREATE INDEX list_items_list_idx ON public.list_items (list_id, sort_order);

GRANT SELECT ON public.list_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT ALL ON public.list_items TO service_role;

ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_list(_list_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.lists l WHERE l.id = _list_id AND l.user_id = _user_id) $$;

CREATE POLICY "Items of public lists are readable"
ON public.list_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND l.is_public = true));

CREATE POLICY "Owners read own list items"
ON public.list_items FOR SELECT TO authenticated
USING (public.owns_list(list_id, auth.uid()));

CREATE POLICY "Owners insert list items"
ON public.list_items FOR INSERT TO authenticated
WITH CHECK (public.owns_list(list_id, auth.uid()));

CREATE POLICY "Owners update list items"
ON public.list_items FOR UPDATE TO authenticated
USING (public.owns_list(list_id, auth.uid()))
WITH CHECK (public.owns_list(list_id, auth.uid()));

CREATE POLICY "Owners delete list items"
ON public.list_items FOR DELETE TO authenticated
USING (public.owns_list(list_id, auth.uid()));