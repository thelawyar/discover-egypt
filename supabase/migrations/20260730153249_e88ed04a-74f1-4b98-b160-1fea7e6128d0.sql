CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  city text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_queries TO authenticated;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search queries admin read" ON public.search_queries;
CREATE POLICY "search queries admin read" ON public.search_queries
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS search_queries_term_idx ON public.search_queries (term);
CREATE INDEX IF NOT EXISTS search_queries_created_idx ON public.search_queries (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_search_query(
  _term text,
  _results integer,
  _city text DEFAULT NULL,
  _category text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text := btrim(coalesce(_term, ''));
BEGIN
  IF length(t) < 2 THEN RETURN; END IF;
  INSERT INTO public.search_queries (term, results_count, city, category)
  VALUES (lower(left(t, 100)), greatest(coalesce(_results, 0), 0), nullif(_city, ''), nullif(_category, ''));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_query(text, integer, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_term_stats(_days integer DEFAULT 30, _limit integer DEFAULT 50)
RETURNS TABLE (term text, searches bigint, avg_results numeric, last_results integer, zero_rate numeric, last_searched timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.term,
    count(*) AS searches,
    round(avg(q.results_count)::numeric, 1) AS avg_results,
    (array_agg(q.results_count ORDER BY q.created_at DESC))[1] AS last_results,
    round((count(*) FILTER (WHERE q.results_count = 0))::numeric * 100 / count(*), 0) AS zero_rate,
    max(q.created_at) AS last_searched
  FROM public.search_queries q
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND q.created_at >= now() - make_interval(days => greatest(coalesce(_days, 30), 1))
  GROUP BY q.term
  ORDER BY count(*) DESC, max(q.created_at) DESC
  LIMIT greatest(coalesce(_limit, 50), 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_term_stats(integer, integer) TO authenticated, service_role;