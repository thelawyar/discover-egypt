ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS theme_font text NOT NULL DEFAULT 'cairo',
  ADD COLUMN IF NOT EXISTS theme_button text NOT NULL DEFAULT 'rounded',
  ADD COLUMN IF NOT EXISTS theme_contrast boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.business_page_stats(_business_id uuid, _days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := greatest(1, least(365, coalesce(_days, 30)));
  v_from timestamptz := now() - (v_days || ' days')::interval;
  v_prev_from timestamptz := now() - ((v_days * 2) || ' days')::interval;
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
    'days', v_days,
    'views', (SELECT count(*) FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'view' AND e.created_at >= v_from),
    'contact_clicks', (SELECT count(*) FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'contact_click' AND e.created_at >= v_from),
    'prev_views', (SELECT count(*) FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'view'
                AND e.created_at >= v_prev_from AND e.created_at < v_from),
    'prev_contact_clicks', (SELECT count(*) FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'contact_click'
                AND e.created_at >= v_prev_from AND e.created_at < v_from),
    'sources', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
              SELECT e.source, count(*) AS count FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'view' AND e.created_at >= v_from
              GROUP BY e.source ORDER BY count(*) DESC LIMIT 10) x),
    'contacts', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
              SELECT coalesce(e.label, 'other') AS label, count(*) AS count FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.event_type = 'contact_click' AND e.created_at >= v_from
              GROUP BY coalesce(e.label, 'other') ORDER BY count(*) DESC LIMIT 10) x),
    'daily', (SELECT coalesce(jsonb_agg(x ORDER BY x.day), '[]'::jsonb) FROM (
              SELECT date_trunc('day', e.created_at)::date AS day,
                     count(*) FILTER (WHERE e.event_type = 'view') AS count,
                     count(*) FILTER (WHERE e.event_type = 'contact_click') AS clicks
              FROM public.business_page_events e
              WHERE e.business_id = _business_id AND e.created_at >= v_from
              GROUP BY 1) x)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.business_page_stats(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.business_page_events_export(_business_id uuid, _days integer DEFAULT 30)
RETURNS TABLE(created_at timestamptz, event_type text, label text, source text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := greatest(1, least(365, coalesce(_days, 30)));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT e.created_at, e.event_type::text, e.label::text, e.source::text
  FROM public.business_page_events e
  WHERE e.business_id = _business_id
    AND e.created_at >= now() - (v_days || ' days')::interval
  ORDER BY e.created_at DESC
  LIMIT 5000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.business_page_events_export(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.business_recent_contacts(_since timestamptz DEFAULT now() - interval '30 days')
RETURNS TABLE(id uuid, business_id uuid, business_name text, username text, label text, source text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.business_id, b.name, b.username, coalesce(e.label, 'other')::text, e.source::text, e.created_at
  FROM public.business_page_events e
  JOIN public.businesses b ON b.id = e.business_id
  WHERE e.event_type = 'contact_click'
    AND e.created_at >= coalesce(_since, now() - interval '30 days')
    AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ORDER BY e.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.business_recent_contacts(timestamptz) TO authenticated;