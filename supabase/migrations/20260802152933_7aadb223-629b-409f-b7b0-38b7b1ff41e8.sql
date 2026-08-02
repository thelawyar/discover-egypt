ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS price_level smallint,
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS good_for text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vibes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occasions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_price_level_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_price_level_check
  CHECK (price_level IS NULL OR (price_level >= 1 AND price_level <= 4));

CREATE INDEX IF NOT EXISTS businesses_amenities_idx ON public.businesses USING gin (amenities);
CREATE INDEX IF NOT EXISTS businesses_payment_methods_idx ON public.businesses USING gin (payment_methods);
CREATE INDEX IF NOT EXISTS businesses_good_for_idx ON public.businesses USING gin (good_for);
CREATE INDEX IF NOT EXISTS businesses_vibes_idx ON public.businesses USING gin (vibes);
CREATE INDEX IF NOT EXISTS businesses_occasions_idx ON public.businesses USING gin (occasions);

CREATE OR REPLACE FUNCTION public.enforce_business_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_text := coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' '
    || coalesce(NEW.address,'') || ' ' || coalesce(array_to_string(NEW.products,' '),'') || ' '
    || coalesce(array_to_string(NEW.amenities,' '),'') || ' '
    || coalesce(array_to_string(NEW.payment_methods,' '),'') || ' '
    || coalesce(array_to_string(NEW.good_for,' '),'') || ' '
    || coalesce(array_to_string(NEW.vibes,' '),'') || ' '
    || coalesce(array_to_string(NEW.occasions,' '),'');
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