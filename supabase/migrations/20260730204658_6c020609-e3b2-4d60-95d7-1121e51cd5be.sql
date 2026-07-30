ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS notify_approved_inapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rejected_inapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_withdrawn_inapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_approved_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rejected_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_withdrawn_email boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.notify_business_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_body text;
  v_user uuid;
  v_event text;
  v_allow boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_event := 'approved';
    v_title := 'تم قبول نشاطك: ' || NEW.name;
    v_body := 'أصبح نشاطك ظاهراً في الدليل ويمكن للزوار الوصول إليه.';
  ELSIF NEW.status = 'rejected' THEN
    v_event := CASE WHEN coalesce(NEW.rejection_reason,'') LIKE 'تم السحب%' THEN 'withdrawn' ELSE 'rejected' END;
    v_title := CASE WHEN v_event = 'withdrawn' THEN 'تم سحب نشاطك: ' ELSE 'تم رفض نشاطك: ' END || NEW.name;
    v_body := coalesce(nullif(NEW.rejection_reason, ''), 'راجع بيانات النشاط ثم أعد إرساله للمراجعة.');
  ELSE
    v_event := 'pending';
    v_title := 'نشاطك قيد المراجعة: ' || NEW.name;
    v_body := 'سيتم إشعارك فور انتهاء مراجعة الإدارة.';
  END IF;

  FOR v_user IN
    SELECT NEW.owner_id WHERE NEW.owner_id IS NOT NULL
    UNION
    SELECT m.user_id FROM public.business_managers m WHERE m.business_id = NEW.id
  LOOP
    SELECT CASE v_event
             WHEN 'approved' THEN s.notify_approved_inapp
             WHEN 'rejected' THEN s.notify_rejected_inapp
             WHEN 'withdrawn' THEN s.notify_withdrawn_inapp
             ELSE true
           END
      INTO v_allow
      FROM public.notification_settings s
     WHERE s.user_id = v_user;

    IF coalesce(v_allow, true) THEN
      INSERT INTO public.notifications (user_id, business_id, type, title, body)
      VALUES (v_user, NEW.id, 'business_status', v_title, v_body);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;