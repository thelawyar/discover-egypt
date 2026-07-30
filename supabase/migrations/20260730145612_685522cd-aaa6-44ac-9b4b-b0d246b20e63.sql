ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS username text;

CREATE OR REPLACE FUNCTION public.normalize_username(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(coalesce(v,''), '[^a-zA-Z0-9-]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.random_username()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v text;
BEGIN
  LOOP
    v := 'biz-' || substr(encode(gen_random_bytes(6), 'hex'), 1, 10);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.username = v);
  END LOOP;
  RETURN v;
END;
$$;

UPDATE public.businesses SET username = public.random_username() WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_username_key ON public.businesses (username);

CREATE OR REPLACE FUNCTION public.enforce_business_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reserved text[] := ARRAY['admin','admin-cities','admin-categories','admin-setup','auth','search','city','business','dashboard','api','sitemap','sitemap.xml','robots','robots.txt','assets','static','login','signup','settings','about','contact','ads'];
BEGIN
  NEW.username := public.normalize_username(NEW.username);
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := public.random_username();
  END IF;
  IF length(NEW.username) < 3 OR length(NEW.username) > 32 THEN
    RAISE EXCEPTION 'invalid_username_length';
  END IF;
  IF NEW.username = ANY(reserved) THEN
    RAISE EXCEPTION 'reserved_username';
  END IF;
  IF NEW.username ~ '^-|-$' THEN
    RAISE EXCEPTION 'invalid_username_format';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_username ON public.businesses;
CREATE TRIGGER trg_businesses_username
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_username();

ALTER TABLE public.businesses ALTER COLUMN username SET NOT NULL;