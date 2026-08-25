CREATE UNIQUE INDEX IF NOT EXISTS cities_governorate_name_norm_unique
ON public.cities (governorate_id, name_norm)
WHERE name_norm IS NOT NULL;

DROP FUNCTION IF EXISTS public.suggest_city(uuid, text);

CREATE FUNCTION public.suggest_city(_governorate_id uuid, _name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text := btrim(regexp_replace(coalesce(_name, ''), '\s+', ' ', 'g'));
  _normalized text;
  _match record;
  _id uuid;
  _slug text;
  _n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF char_length(_clean) < 2 OR char_length(_clean) > 60 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.governorates g WHERE g.id = _governorate_id) THEN
    RAISE EXCEPTION 'invalid_governorate';
  END IF;

  _normalized := public.ar_norm(_clean);

  SELECT c.id, c.name, c.is_active, 1.0::real AS score
  INTO _match
  FROM public.cities c
  WHERE c.governorate_id = _governorate_id
    AND c.name_norm = _normalized
  LIMIT 1;

  IF _match.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'existing',
      'id', _match.id,
      'name', _match.name,
      'is_active', _match.is_active,
      'similarity', 1
    );
  END IF;

  SELECT c.id, c.name, c.is_active,
         similarity(c.name_norm, _normalized) AS score
  INTO _match
  FROM public.cities c
  WHERE c.governorate_id = _governorate_id
    AND (
      similarity(c.name_norm, _normalized) >= 0.72
      OR c.name_norm LIKE '%' || _normalized || '%'
      OR _normalized LIKE '%' || c.name_norm || '%'
    )
  ORDER BY score DESC, c.is_active DESC, c.name
  LIMIT 1;

  IF _match.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'similar',
      'id', _match.id,
      'name', _match.name,
      'is_active', _match.is_active,
      'similarity', round(_match.score::numeric, 2)
    );
  END IF;

  _slug := public.make_slug(_clean);
  IF _slug IS NULL OR _slug = '' THEN
    _slug := 'city';
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.cities c WHERE c.slug = _slug) LOOP
    _n := _n + 1;
    _slug := public.make_slug(_clean) || '-' || _n::text;
  END LOOP;

  BEGIN
    INSERT INTO public.cities (governorate_id, name, slug, is_new_city, is_active)
    VALUES (_governorate_id, _clean, _slug, true, false)
    RETURNING id INTO _id;
  EXCEPTION WHEN unique_violation THEN
    SELECT c.id, c.name, c.is_active
    INTO _match
    FROM public.cities c
    WHERE c.governorate_id = _governorate_id
      AND c.name_norm = _normalized
    LIMIT 1;

    RETURN jsonb_build_object(
      'status', 'existing',
      'id', _match.id,
      'name', _match.name,
      'is_active', _match.is_active,
      'similarity', 1
    );
  END;

  RETURN jsonb_build_object(
    'status', 'created',
    'id', _id,
    'name', _clean,
    'is_active', false,
    'similarity', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.suggest_city(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_city(uuid, text) TO authenticated, service_role;