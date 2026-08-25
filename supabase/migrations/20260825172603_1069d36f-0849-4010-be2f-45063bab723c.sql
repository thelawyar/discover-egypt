CREATE OR REPLACE FUNCTION public.suggest_city(_governorate_id uuid, _name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text := btrim(coalesce(_name, ''));
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

  SELECT c.id INTO _id
  FROM public.cities c
  WHERE c.governorate_id = _governorate_id
    AND public.ar_norm(c.name) = public.ar_norm(_clean)
  LIMIT 1;
  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  _slug := public.make_slug(_clean);
  IF _slug IS NULL OR _slug = '' THEN
    _slug := 'city';
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.cities c WHERE c.slug = _slug) LOOP
    _n := _n + 1;
    _slug := public.make_slug(_clean) || '-' || _n::text;
  END LOOP;

  INSERT INTO public.cities (governorate_id, name, slug, is_new_city, is_active)
  VALUES (_governorate_id, _clean, _slug, false, false)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.suggest_city(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_city(uuid, text) TO authenticated;