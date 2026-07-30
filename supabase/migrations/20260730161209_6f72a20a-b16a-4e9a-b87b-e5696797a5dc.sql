CREATE TABLE public.business_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_phone text,
  sender_email text,
  kind text NOT NULL DEFAULT 'message',
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_messages_kind_check CHECK (kind IN ('message','order')),
  CONSTRAINT business_messages_body_len CHECK (char_length(body) BETWEEN 2 AND 2000),
  CONSTRAINT business_messages_name_len CHECK (char_length(sender_name) BETWEEN 2 AND 100)
);

CREATE INDEX business_messages_business_idx ON public.business_messages (business_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_messages TO authenticated;
GRANT INSERT ON public.business_messages TO anon;
GRANT ALL ON public.business_messages TO service_role;

ALTER TABLE public.business_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages public insert to approved business"
ON public.business_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  is_read = false AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.status = 'approved'
  )
);

CREATE POLICY "messages team read"
ON public.business_messages FOR SELECT TO authenticated
USING (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "messages team update"
ON public.business_messages FOR UPDATE TO authenticated
USING (public.can_manage_business(business_id, auth.uid()))
WITH CHECK (public.can_manage_business(business_id, auth.uid()));

CREATE POLICY "messages team delete"
ON public.business_messages FOR DELETE TO authenticated
USING (public.can_manage_business(business_id, auth.uid()));

CREATE TRIGGER business_messages_updated_at
BEFORE UPDATE ON public.business_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  notify_messages boolean NOT NULL DEFAULT true,
  notify_contact_clicks boolean NOT NULL DEFAULT true,
  sound_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notification settings"
ON public.notification_settings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.business_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_messages;