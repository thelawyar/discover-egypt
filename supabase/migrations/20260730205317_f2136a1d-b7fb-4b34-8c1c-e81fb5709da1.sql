
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.ar_norm(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
    regexp_replace(
      translate(
        regexp_replace(coalesce(_t,''), '[\u0640\u064B-\u0652\u0670\u0653-\u0655]', '', 'g'),
        'أإآٱىئؤةڤگچ',
        'اااايياهفكش'
      ),
      '\s+', ' ', 'g'
    )
  )
$$;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS search_norm text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.enforce_business_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_text := coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' '
    || coalesce(NEW.address,'') || ' ' || coalesce(array_to_string(NEW.products,' '),'');
  NEW.search_norm := public.ar_norm(NEW.search_text);
  IF public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND coalesce(current_setting('app.business_withdraw', true), '') = 'on'
     AND public.can_manage_business(OLD.id, auth.uid()) THEN
    NEW.status := 'rejected';
    NEW.is_featured := false;
    NEW.view_count := OLD.view_count;
    NEW.owner_id := OLD.owner_id;
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.is_featured := false;
  IF TG_OP = 'UPDATE' THEN
    NEW.view_count := OLD.view_count;
    NEW.owner_id := OLD.owner_id;
  END IF;
  RETURN NEW;
END; $function$;

UPDATE public.businesses
   SET search_norm = public.ar_norm(
     coalesce(name,'') || ' ' || coalesce(description,'') || ' '
     || coalesce(address,'') || ' ' || coalesce(array_to_string(products,' '),''));

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_norm text GENERATED ALWAYS AS (public.ar_norm(name)) STORED;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS name_norm text GENERATED ALWAYS AS (public.ar_norm(name)) STORED;
ALTER TABLE public.governorates ADD COLUMN IF NOT EXISTS name_norm text GENERATED ALWAYS AS (public.ar_norm(name)) STORED;

CREATE INDEX IF NOT EXISTS businesses_search_norm_trgm ON public.businesses USING gin (search_norm extensions.gin_trgm_ops);
