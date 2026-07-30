CREATE TABLE public.business_moderation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id uuid,
  from_status public.business_status,
  to_status public.business_status NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX business_moderation_log_business_idx ON public.business_moderation_log (business_id, created_at DESC);

GRANT SELECT ON public.business_moderation_log TO authenticated;
GRANT ALL ON public.business_moderation_log TO service_role;

ALTER TABLE public.business_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read moderation log" ON public.business_moderation_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners read own moderation log" ON public.business_moderation_log
  FOR SELECT TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.log_business_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_moderation_log (business_id, actor_id, from_status, to_status, reason)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, NEW.rejection_reason);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR (NEW.status = 'rejected' AND NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason) THEN
    INSERT INTO public.business_moderation_log (business_id, actor_id, from_status, to_status, reason)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.rejection_reason);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_moderation_log_trg
AFTER INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.log_business_moderation();