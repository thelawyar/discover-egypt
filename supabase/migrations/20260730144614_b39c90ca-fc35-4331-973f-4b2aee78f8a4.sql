ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS adsense_slot_search text,
  ADD COLUMN IF NOT EXISTS adsense_slot_business text,
  ADD COLUMN IF NOT EXISTS ad_positions text NOT NULL DEFAULT '3,6';

CREATE OR REPLACE FUNCTION public.track_ad_impression(_ad_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ads SET impression_count = impression_count + 1 WHERE id = _ad_id;
$$;

CREATE OR REPLACE FUNCTION public.track_ad_click(_ad_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ads SET click_count = click_count + 1 WHERE id = _ad_id;
$$;

GRANT EXECUTE ON FUNCTION public.track_ad_impression(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_ad_click(uuid) TO anon, authenticated;