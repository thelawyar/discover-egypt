CREATE TYPE public.ad_placement AS ENUM ('home', 'search', 'business');

CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  image_url text,
  target_url text NOT NULL,
  advertiser text,
  placement public.ad_placement NOT NULL DEFAULT 'search',
  governorate_id uuid REFERENCES public.governorates(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  impression_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads public read active" ON public.ads
FOR SELECT TO anon, authenticated
USING (is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "ads admin all" ON public.ads
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX ads_placement_idx ON public.ads (placement, is_active, priority DESC);

ALTER TABLE public.site_settings
  ADD COLUMN adsense_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN adsense_client text,
  ADD COLUMN adsense_slot text,
  ADD COLUMN adsense_every integer NOT NULL DEFAULT 4;