ALTER TABLE public.business_events
  ADD COLUMN IF NOT EXISTS status public.business_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE public.business_events SET status = 'approved' WHERE is_published = true;

CREATE INDEX IF NOT EXISTS business_events_status_idx ON public.business_events (status, starts_at);

DROP POLICY IF EXISTS "Public can read published events of approved businesses" ON public.business_events;
CREATE POLICY "Public can read approved events of approved businesses"
ON public.business_events FOR SELECT
USING (
  is_published = true AND status = 'approved' AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_events.business_id AND b.status = 'approved'
  )
);

CREATE OR REPLACE FUNCTION public.sync_event_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old public.business_events%ROWTYPE;
BEGIN
  SELECT b.city_id, b.governorate_id INTO NEW.city_id, NEW.governorate_id
  FROM public.businesses b WHERE b.id = NEW.business_id;

  NEW.created_by := coalesce(NEW.created_by, auth.uid());

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_old FROM public.business_events e WHERE e.id = NEW.id;
  NEW.is_featured := coalesce(v_old.is_featured, false);

  IF TG_OP = 'INSERT'
     OR NEW.title IS DISTINCT FROM v_old.title
     OR NEW.description IS DISTINCT FROM v_old.description
     OR NEW.image_url IS DISTINCT FROM v_old.image_url
     OR NEW.venue IS DISTINCT FROM v_old.venue
     OR NEW.external_url IS DISTINCT FROM v_old.external_url
     OR NEW.price_info IS DISTINCT FROM v_old.price_info
     OR NEW.kind IS DISTINCT FROM v_old.kind
     OR NEW.starts_at IS DISTINCT FROM v_old.starts_at
     OR NEW.ends_at IS DISTINCT FROM v_old.ends_at THEN
    NEW.status := 'pending';
    NEW.rejection_reason := NULL;
  ELSE
    NEW.status := coalesce(v_old.status, 'pending');
    NEW.rejection_reason := v_old.rejection_reason;
  END IF;

  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_event_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
  v_title text;
  v_body text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_title := 'تم قبول الحدث: ' || NEW.title;
    v_body := 'أصبح الحدث ظاهراً في الدليل.';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'تم رفض الحدث: ' || NEW.title;
    v_body := coalesce(nullif(NEW.rejection_reason, ''), 'راجع بيانات الحدث ثم أعد إرساله للمراجعة.');
  ELSE
    RETURN NEW;
  END IF;

  FOR v_user IN
    SELECT b.owner_id FROM public.businesses b WHERE b.id = NEW.business_id AND b.owner_id IS NOT NULL
    UNION
    SELECT m.user_id FROM public.business_managers m WHERE m.business_id = NEW.business_id
  LOOP
    INSERT INTO public.notifications (user_id, business_id, type, title, body)
    VALUES (v_user, NEW.business_id, 'event_status', v_title, v_body);
  END LOOP;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_event_status_trg ON public.business_events;
CREATE TRIGGER notify_event_status_trg
AFTER INSERT OR UPDATE ON public.business_events
FOR EACH ROW EXECUTE FUNCTION public.notify_event_status();

CREATE TABLE IF NOT EXISTS public.event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.business_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT ON public.event_reminders TO authenticated;
GRANT ALL ON public.event_reminders TO service_role;
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own event reminders"
ON public.event_reminders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.run_event_reminders(_hours integer DEFAULT 48)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_h integer := greatest(1, least(168, coalesce(_hours, 48)));
  v_count integer := 0;
  r record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT e.id, e.business_id, e.title, e.starts_at, b.name AS business_name
    FROM public.business_events e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.status = 'approved'
      AND e.is_published = true
      AND e.starts_at > now()
      AND e.starts_at <= now() + (v_h || ' hours')::interval
      AND (
        b.owner_id = v_uid
        OR EXISTS (SELECT 1 FROM public.business_managers m WHERE m.business_id = b.id AND m.user_id = v_uid)
        OR EXISTS (
          SELECT 1 FROM public.list_items li
          JOIN public.lists l ON l.id = li.list_id
          WHERE li.business_id = b.id AND l.user_id = v_uid
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.event_reminders er WHERE er.event_id = e.id AND er.user_id = v_uid
      )
  LOOP
    INSERT INTO public.event_reminders (event_id, user_id) VALUES (r.id, v_uid)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.notifications (user_id, business_id, type, title, body)
    VALUES (
      v_uid,
      r.business_id,
      'event_reminder',
      'اقترب موعد: ' || r.title,
      'يبدأ لدى ' || r.business_name || ' في ' || to_char(r.starts_at AT TIME ZONE 'Africa/Cairo', 'YYYY-MM-DD HH24:MI')
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END; $$;