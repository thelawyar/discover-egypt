ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT 'استكشف مدينتك',
  ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT 'الدليل التجاري الشامل لكل المدن المصرية';

UPDATE public.site_settings
SET hero_title = 'استكشف مدينتك',
    hero_subtitle = 'الدليل التجاري الشامل لكل المدن المصرية'
WHERE id = 'default';