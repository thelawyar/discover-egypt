CREATE TABLE public.business_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_reports_status_chk CHECK (status IN ('open','resolved','dismissed')),
  CONSTRAINT business_reports_reason_chk CHECK (reason IN ('closed','wrong_info','duplicate','spam','offensive','other'))
);

GRANT INSERT ON public.business_reports TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.business_reports TO authenticated;
GRANT ALL ON public.business_reports TO service_role;

ALTER TABLE public.business_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can report" ON public.business_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(btrim(coalesce(details,''))) <= 1000);

CREATE POLICY "admins read reports" ON public.business_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update reports" ON public.business_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete reports" ON public.business_reports
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_reports_updated_at
  BEFORE UPDATE ON public.business_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid;
  v_name text;
BEGIN
  SELECT name INTO v_name FROM public.businesses WHERE id = NEW.business_id;
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, business_id, type, title, body)
    VALUES (v_admin, NEW.business_id, 'business_report',
            'بلاغ جديد على نشاط: ' || coalesce(v_name, ''),
            coalesce(nullif(NEW.details, ''), NEW.reason));
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_reports_notify
  AFTER INSERT ON public.business_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_report();