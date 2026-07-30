CREATE OR REPLACE FUNCTION public.track_business_event(_business_id uuid, _event_type text, _source text DEFAULT 'direct'::text, _label text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _event_type NOT IN ('view', 'contact_click', 'card_click') THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_directory_stats(_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer := greatest(1, least(365, coalesce(_days, 30)));
  v_from timestamptz := now() - (v_days || ' days')::interval;
  v_prev_from timestamptz := now() - ((v_days * 2) || ' days')::interval;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'days', v_days,
    'views', (SELECT count(*) FROM public.business_page_events e WHERE e.event_type = 'view' AND e.created_at >= v_from),
    'prev_views', (SELECT count(*) FROM public.business_page_events e WHERE e.event_type = 'view' AND e.created_at >= v_prev_from AND e.created_at < v_from),
    'contact_clicks', (SELECT count(*) FROM public.business_page_events e WHERE e.event_type = 'contact_click' AND e.created_at >= v_from),
    'prev_contact_clicks', (SELECT count(*) FROM public.business_page_events e WHERE e.event_type = 'contact_click' AND e.created_at >= v_prev_from AND e.created_at < v_from),
    'card_clicks', (SELECT count(*) FROM public.business_page_events e WHERE e.event_type = 'card_click' AND e.created_at >= v_from),
    'prev_card_clicks', (SELECT count(*) FROM public.business_page_events e WHERE e.event_type = 'card_click' AND e.created_at >= v_prev_from AND e.created_at < v_from),
    'searches', (SELECT count(*) FROM public.search_queries q WHERE q.created_at >= v_from),
    'prev_searches', (SELECT count(*) FROM public.search_queries q WHERE q.created_at >= v_prev_from AND q.created_at < v_from),
    'zero_searches', (SELECT count(*) FROM public.search_queries q WHERE q.created_at >= v_from AND q.results_count = 0),
    'daily', (SELECT coalesce(jsonb_agg(x ORDER BY x.day), '[]'::jsonb) FROM (
        SELECT date_trunc('day', e.created_at)::date AS day,
               count(*) FILTER (WHERE e.event_type = 'view') AS views,
               count(*) FILTER (WHERE e.event_type = 'contact_click') AS contact_clicks,
               count(*) FILTER (WHERE e.event_type = 'card_click') AS card_clicks
        FROM public.business_page_events e
        WHERE e.created_at >= v_from
        GROUP BY 1) x),
    'top_businesses', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT b.id, b.name, b.username,
               count(*) FILTER (WHERE e.event_type = 'view') AS views,
               count(*) FILTER (WHERE e.event_type = 'card_click') AS card_clicks,
               count(*) FILTER (WHERE e.event_type = 'contact_click') AS contact_clicks
        FROM public.business_page_events e
        JOIN public.businesses b ON b.id = e.business_id
        WHERE e.created_at >= v_from
        GROUP BY b.id, b.name, b.username
        ORDER BY count(*) DESC
        LIMIT 10) x),
    'top_terms', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT q.term, count(*) AS searches,
               round(avg(q.results_count)::numeric, 1) AS avg_results
        FROM public.search_queries q
        WHERE q.created_at >= v_from
        GROUP BY q.term
        ORDER BY count(*) DESC
        LIMIT 10) x)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;