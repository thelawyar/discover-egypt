ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS cities_gov_active_idx ON public.cities (governorate_id, is_active);