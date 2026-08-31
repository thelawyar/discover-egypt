ALTER TABLE public.business_messages
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS unread_for_sender boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS business_messages_sender_id_idx ON public.business_messages (sender_id);

-- allow senders to attach their own account id (or none) on insert
DROP POLICY IF EXISTS "messages public insert to approved business" ON public.business_messages;
CREATE POLICY "messages public insert to approved business"
ON public.business_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  is_read = false
  AND (sender_id IS NULL OR sender_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_messages.business_id AND b.status = 'approved'
  )
);

CREATE POLICY "messages sender read own"
ON public.business_messages FOR SELECT TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "messages sender update own"
ON public.business_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.business_message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.business_messages(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_business boolean NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_message_replies_message_idx
  ON public.business_message_replies (message_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.business_message_replies TO authenticated;
GRANT ALL ON public.business_message_replies TO service_role;

ALTER TABLE public.business_message_replies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_message(_message_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_messages m
    WHERE m.id = _message_id
      AND (m.sender_id = _user_id OR public.can_manage_business(m.business_id, _user_id))
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_message(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_message(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "replies read participants"
ON public.business_message_replies FOR SELECT TO authenticated
USING (public.can_view_message(message_id, auth.uid()));

CREATE POLICY "replies insert participants"
ON public.business_message_replies FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.can_view_message(message_id, auth.uid())
  AND (
    (from_business = true AND EXISTS (
      SELECT 1 FROM public.business_messages m
      WHERE m.id = message_id AND public.can_manage_business(m.business_id, auth.uid())
    ))
    OR
    (from_business = false AND EXISTS (
      SELECT 1 FROM public.business_messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    ))
  )
);

CREATE POLICY "replies delete own"
ON public.business_message_replies FOR DELETE TO authenticated
USING (sender_id = auth.uid());

CREATE TRIGGER update_business_message_replies_updated_at
BEFORE UPDATE ON public.business_message_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- notify the other party on new reply, and update thread state
CREATE OR REPLACE FUNCTION public.handle_message_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _msg record;
  _biz record;
BEGIN
  SELECT * INTO _msg FROM public.business_messages WHERE id = NEW.message_id;
  SELECT id, name, owner_id INTO _biz FROM public.businesses WHERE id = _msg.business_id;

  UPDATE public.business_messages
  SET last_reply_at = NEW.created_at,
      is_read = CASE WHEN NEW.from_business THEN true ELSE false END,
      unread_for_sender = CASE WHEN NEW.from_business THEN true ELSE false END
  WHERE id = NEW.message_id;

  IF NEW.from_business THEN
    IF _msg.sender_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, business_id, type, title, body)
      VALUES (_msg.sender_id, _biz.id, 'message_reply',
              'رد جديد من ' || coalesce(_biz.name, 'النشاط'), left(NEW.body, 160));
    END IF;
  ELSE
    INSERT INTO public.notifications (user_id, business_id, type, title, body)
    SELECT u, _biz.id, 'message_reply',
           'رد جديد على رسالة في ' || coalesce(_biz.name, 'نشاطك'), left(NEW.body, 160)
    FROM (
      SELECT _biz.owner_id AS u
      UNION
      SELECT bm.user_id FROM public.business_managers bm WHERE bm.business_id = _biz.id
    ) t WHERE t.u IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_business_message_reply ON public.business_message_replies;
CREATE TRIGGER on_business_message_reply
AFTER INSERT ON public.business_message_replies
FOR EACH ROW EXECUTE FUNCTION public.handle_message_reply();

-- notify business team on a brand new message
CREATE OR REPLACE FUNCTION public.notify_new_business_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _biz record;
BEGIN
  SELECT id, name, owner_id INTO _biz FROM public.businesses WHERE id = NEW.business_id;
  INSERT INTO public.notifications (user_id, business_id, type, title, body)
  SELECT u, _biz.id, 'message_new',
         CASE WHEN NEW.kind = 'order' THEN 'طلب جديد على ' ELSE 'رسالة جديدة على ' END || coalesce(_biz.name, 'نشاطك'),
         NEW.sender_name || ': ' || left(NEW.body, 140)
  FROM (
    SELECT _biz.owner_id AS u
    UNION
    SELECT bm.user_id FROM public.business_managers bm WHERE bm.business_id = _biz.id
  ) t WHERE t.u IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_business_message ON public.business_messages;
CREATE TRIGGER on_new_business_message
AFTER INSERT ON public.business_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_business_message();