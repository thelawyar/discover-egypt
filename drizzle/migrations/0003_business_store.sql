CREATE TABLE public.store_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  payment_methods text[] NOT NULL DEFAULT '{cod}',
  wallet_number text,
  instapay_handle text,
  shipping_prepay_required boolean NOT NULL DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  size text,
  color text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.store_products(business_id);
CREATE INDEX ON public.store_variants(product_id);
CREATE INDEX ON public.store_shipping_methods(business_id);

GRANT SELECT ON public.store_settings, public.store_products, public.store_variants, public.store_shipping_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings, public.store_products, public.store_variants, public.store_shipping_methods TO authenticated;
GRANT ALL ON public.store_settings, public.store_products, public.store_variants, public.store_shipping_methods TO service_role;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.store_is_public(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses b JOIN public.store_settings s ON s.business_id = b.id
    WHERE b.id = _business_id AND b.status = 'approved' AND s.is_enabled);
$$;
GRANT EXECUTE ON FUNCTION public.store_is_public(uuid) TO anon, authenticated;

CREATE POLICY "store settings read" ON public.store_settings FOR SELECT TO anon, authenticated
  USING (public.store_is_public(business_id) OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "store settings manage" ON public.store_settings FOR ALL TO authenticated
  USING (public.can_manage_business(business_id, auth.uid())) WITH CHECK (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "store products read" ON public.store_products FOR SELECT TO anon, authenticated
  USING ((is_active AND public.store_is_public(business_id)) OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "store products manage" ON public.store_products FOR ALL TO authenticated
  USING (public.can_manage_business(business_id, auth.uid())) WITH CHECK (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "store variants read" ON public.store_variants FOR SELECT TO anon, authenticated
  USING (public.store_is_public(business_id) OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "store variants manage" ON public.store_variants FOR ALL TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()))
  WITH CHECK (public.can_manage_business(business_id, auth.uid()) AND EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id AND p.business_id = store_variants.business_id));

CREATE POLICY "store shipping read" ON public.store_shipping_methods FOR SELECT TO anon, authenticated
  USING ((is_active AND public.store_is_public(business_id)) OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "store shipping manage" ON public.store_shipping_methods FOR ALL TO authenticated
  USING (public.can_manage_business(business_id, auth.uid())) WITH CHECK (public.can_manage_business(business_id, auth.uid()));

CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();