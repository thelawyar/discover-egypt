CREATE OR REPLACE FUNCTION public.enforce_business_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_text := coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' '
    || coalesce(NEW.address,'') || ' ' || coalesce(array_to_string(NEW.products,' '),'');
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

CREATE OR REPLACE FUNCTION public.business_withdraw(_business_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_business(_business_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  PERFORM set_config('app.business_withdraw', 'on', true);
  UPDATE public.businesses
     SET status = 'rejected',
         rejection_reason = 'تم السحب بواسطة صاحب النشاط'
   WHERE id = _business_id;
  PERFORM set_config('app.business_withdraw', 'off', true);
  RETURN true;
END; $function$;

REVOKE ALL ON FUNCTION public.business_withdraw(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.business_withdraw(uuid) TO authenticated;