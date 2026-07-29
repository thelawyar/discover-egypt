CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'default',
  site_name text NOT NULL DEFAULT 'اكتشف مدينتك',
  tagline text NOT NULL DEFAULT 'دليل تجاري شامل لكل المدن المصرية',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#2f6df6',
  accent_color text NOT NULL DEFAULT '#eaf1ff',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_single_row CHECK (id = 'default')
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site settings public read" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "site settings admin write" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (id) VALUES ('default');

CREATE POLICY "branding admin write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));