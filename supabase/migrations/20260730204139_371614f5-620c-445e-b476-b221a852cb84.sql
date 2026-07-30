CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'business_status',
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_business_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_body text;
  v_user uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_title := 'تم قبول نشاطك: ' || NEW.name;
    v_body := 'أصبح نشاطك ظاهراً في الدليل ويمكن للزوار الوصول إليه.';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'تم رفض/سحب نشاطك: ' || NEW.name;
    v_body := coalesce(nullif(NEW.rejection_reason, ''), 'راجع بيانات النشاط ثم أعد إرساله للمراجعة.');
  ELSE
    v_title := 'نشاطك قيد المراجعة: ' || NEW.name;
    v_body := 'سيتم إشعارك فور انتهاء مراجعة الإدارة.';
  END IF;

  FOR v_user IN
    SELECT NEW.owner_id WHERE NEW.owner_id IS NOT NULL
    UNION
    SELECT m.user_id FROM public.business_managers m WHERE m.business_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, business_id, type, title, body)
    VALUES (v_user, NEW.id, 'business_status', v_title, v_body);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_business_status_trg
AFTER UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.notify_business_status();