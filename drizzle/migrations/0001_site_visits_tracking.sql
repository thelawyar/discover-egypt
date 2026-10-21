CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  visitor_id text,
  source text NOT NULL DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.site_visits TO service_role;
GRANT SELECT ON public.site_visits TO authenticated;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read visits" ON public.site_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX ON public.site_visits(created_at DESC);

CREATE OR REPLACE FUNCTION public.track_site_visit(_path text, _visitor text, _source text DEFAULT 'direct')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _path IS NULL OR _path LIKE '/admin%' OR _path LIKE '/dashboard%' THEN RETURN; END IF;
  INSERT INTO public.site_visits(path, visitor_id, source)
  VALUES (left(_path, 200), nullif(left(coalesce(_visitor,''), 64), ''), coalesce(nullif(left(trim(_source),80),''),'direct'));
END $$;
GRANT EXECUTE ON FUNCTION public.track_site_visit(text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_traffic_stats(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_days integer := greatest(1, least(365, coalesce(_days, 30)));
  v_from timestamptz := now() - (v_days || ' days')::interval;
  v_prev timestamptz := now() - ((v_days*2) || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'visits', (SELECT count(*) FROM site_visits WHERE created_at >= v_from),
    'prev_visits', (SELECT count(*) FROM site_visits WHERE created_at >= v_prev AND created_at < v_from),
    'visitors', (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE created_at >= v_from),
    'prev_visitors', (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE created_at >= v_prev AND created_at < v_from),
    'today', (SELECT count(*) FROM site_visits WHERE created_at >= date_trunc('day', now())),
    'total', (SELECT count(*) FROM site_visits),
    'top_pages', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT path, count(*) AS visits FROM site_visits WHERE created_at >= v_from GROUP BY path ORDER BY 2 DESC LIMIT 10) x),
    'sources', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT source, count(*) AS visits FROM site_visits WHERE created_at >= v_from GROUP BY source ORDER BY 2 DESC LIMIT 8) x),
    'click_types', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT coalesce(label,'other') AS label, count(*) AS clicks FROM business_page_events
      WHERE event_type = 'contact_click' AND created_at >= v_from GROUP BY 1 ORDER BY 2 DESC) x)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_traffic_stats(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_traffic_stats(integer) TO authenticated;