CREATE TABLE public.business_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

GRANT SELECT ON public.business_managers TO authenticated;
GRANT ALL ON public.business_managers TO service_role;

ALTER TABLE public.business_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_business_manager(_business_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_managers m
    WHERE m.business_id = _business_id AND m.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id AND b.owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(_business_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_business_owner(_business_id, _user_id)
    OR public.is_business_manager(_business_id, _user_id)
    OR public.has_role(_user_id, 'admin')
  );
$$;

CREATE POLICY "managers readable by team"
  ON public.business_managers FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_business_owner(business_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "managers admin write"
  ON public.business_managers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "businesses manager read"
  ON public.businesses FOR SELECT TO authenticated
  USING (public.is_business_manager(id, auth.uid()));

CREATE POLICY "businesses manager update"
  ON public.businesses FOR UPDATE TO authenticated
  USING (public.is_business_manager(id, auth.uid()))
  WITH CHECK (public.is_business_manager(id, auth.uid()));

CREATE POLICY "images manager all"
  ON public.business_images FOR ALL TO authenticated
  USING (public.is_business_manager(business_id, auth.uid()))
  WITH CHECK (public.is_business_manager(business_id, auth.uid()));

CREATE POLICY "hours manager all"
  ON public.business_hours FOR ALL TO authenticated
  USING (public.is_business_manager(business_id, auth.uid()))
  WITH CHECK (public.is_business_manager(business_id, auth.uid()));

CREATE POLICY "page events manager read"
  ON public.business_page_events FOR SELECT TO authenticated
  USING (public.is_business_manager(business_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.business_list_managers(_business_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT m.user_id, u.email::text, p.full_name, m.created_at
  FROM public.business_managers m
  JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.business_id = _business_id
  ORDER BY m.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.business_add_manager(_business_id uuid, _email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(coalesce(_email, '')));
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  INSERT INTO public.business_managers (business_id, user_id, created_by)
  VALUES (_business_id, v_user, auth.uid())
  ON CONFLICT (business_id, user_id) DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.business_remove_manager(_business_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_business_owner(_business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.business_managers WHERE business_id = _business_id AND user_id = _user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_business_owner(_business_id uuid, _email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(coalesce(_email, '')));
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  UPDATE public.businesses SET owner_id = v_user WHERE id = _business_id;
  DELETE FROM public.business_managers WHERE business_id = _business_id AND user_id = v_user;
  RETURN true;
END;
$$;