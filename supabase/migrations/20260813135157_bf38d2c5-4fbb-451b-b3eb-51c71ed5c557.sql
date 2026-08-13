ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_hiring boolean NOT NULL DEFAULT false;

CREATE TABLE public.business_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  employment_type text,
  salary_range text,
  contact text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX business_jobs_business_id_idx ON public.business_jobs(business_id);

GRANT SELECT ON public.business_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_jobs TO authenticated;
GRANT ALL ON public.business_jobs TO service_role;

ALTER TABLE public.business_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active jobs of approved businesses"
ON public.business_jobs FOR SELECT TO anon, authenticated
USING (
  is_active AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_jobs.business_id AND b.status = 'approved'
  )
);

CREATE POLICY "Managers can view their jobs"
ON public.business_jobs FOR SELECT TO authenticated
USING (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert jobs"
ON public.business_jobs FOR INSERT TO authenticated
WITH CHECK (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update jobs"
ON public.business_jobs FOR UPDATE TO authenticated
USING (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can delete jobs"
ON public.business_jobs FOR DELETE TO authenticated
USING (public.can_manage_business(business_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_jobs_updated_at
BEFORE UPDATE ON public.business_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_business_is_hiring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bid uuid := COALESCE(NEW.business_id, OLD.business_id);
BEGIN
  UPDATE public.businesses b
  SET is_hiring = EXISTS (
    SELECT 1 FROM public.business_jobs j
    WHERE j.business_id = _bid AND j.is_active
  )
  WHERE b.id = _bid;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_business_is_hiring() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER business_jobs_sync_hiring
AFTER INSERT OR UPDATE OR DELETE ON public.business_jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_business_is_hiring();