-- 1) Theme customization for the business mini-site
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS theme_primary text,
  ADD COLUMN IF NOT EXISTS theme_bg text,
  ADD COLUMN IF NOT EXISTS theme_style text NOT NULL DEFAULT 'classic';

-- 2) Username history (keeps 301 redirects working)
CREATE TABLE IF NOT EXISTS public.business_username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  username text NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS business_username_history_username_idx
  ON public.business_username_history (username);
CREATE INDEX IF NOT EXISTS business_username_history_business_idx
  ON public.business_username_history (business_id);

GRANT SELECT ON public.business_username_history TO authenticated;
GRANT SELECT ON public.business_username_history TO anon;
GRANT ALL ON public.business_username_history TO service_role;

ALTER TABLE public.business_username_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "username history public read"
  ON public.business_username_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "username history admin write"
  ON public.business_username_history FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_username_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.username IS DISTINCT FROM OLD.username THEN
    DELETE FROM public.business_username_history WHERE username = NEW.username;
    INSERT INTO public.business_username_history (business_id, username, changed_by)
    VALUES (OLD.id, OLD.username, auth.uid())
    ON CONFLICT (username) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_username_change ON public.businesses;
CREATE TRIGGER trg_record_username_change
  AFTER UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.record_username_change();

-- 3) Page analytics
CREATE TABLE IF NOT EXISTS public.business_page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  label text,
  source text NOT NULL DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_page_events_biz_idx
  ON public.business_page_events (business_id, created_at DESC);

GRANT SELECT ON public.business_page_events TO authenticated;
GRANT ALL ON public.business_page_events TO service_role;

ALTER TABLE public.business_page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page events owner read"
  ON public.business_page_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_page_events.business_id
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE OR REPLACE FUNCTION public.track_business_event(
  _business_id uuid,
  _event_type text,
  _source text DEFAULT 'direct',
  _label text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _event_type NOT IN ('view', 'contact_click') THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id AND b.status = 'approved'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.business_page_events (business_id, event_type, source, label)
  VALUES (
    _business_id,
    _event_type,
    coalesce(nullif(left(trim(_source), 80), ''), 'direct'),
    nullif(left(trim(coalesce(_label, '')), 80), '')
  );

  IF _event_type = 'view' THEN
    UPDATE public.businesses SET view_count = view_count + 1 WHERE id = _business_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_business_event(uuid, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.business_page_stats(_business_id uuid, _days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := now() - (greatest(1, least(365, coalesce(_days, 30))) || ' days')::interval;
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'views', (SELECT count(*) FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'view' AND e.created_at >= v_from),
    'contact_clicks', (SELECT count(*) FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'contact_click' AND e.created_at >= v_from),
    'sources', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
              SELECT e.source, count(*) AS count FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'view' AND e.created_at >= v_from
              GROUP BY e.source ORDER BY count(*) DESC LIMIT 10) x),
    'contacts', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
              SELECT coalesce(e.label, 'other') AS label, count(*) AS count FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'contact_click' AND e.created_at >= v_from
              GROUP BY coalesce(e.label, 'other') ORDER BY count(*) DESC LIMIT 10) x),
    'daily', (SELECT coalesce(jsonb_agg(x ORDER BY x.day), '[]'::jsonb) FROM (
              SELECT date_trunc('day', e.created_at)::date AS day, count(*) AS count
              FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'view' AND e.created_at >= v_from
              GROUP BY 1) x)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.business_page_stats(uuid, integer) TO authenticated;