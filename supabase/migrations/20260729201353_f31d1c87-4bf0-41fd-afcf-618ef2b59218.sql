CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.admin_invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  label text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invite_tokens TO authenticated;
GRANT ALL ON public.admin_invite_tokens TO service_role;

ALTER TABLE public.admin_invite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites admin read"
  ON public.admin_invite_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "invites admin write"
  ON public.admin_invite_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bootstrap token (plaintext shown once to the project owner).
INSERT INTO public.admin_invite_tokens (token_hash, label, expires_at)
VALUES (
  'f5459c92f6c9e956929cd7b5c3863e40491bdb6d022f57432325172c32414e46',
  'رمز التأسيس الأول',
  now() + interval '30 days'
);

CREATE OR REPLACE FUNCTION public.claim_admin_invite(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _token IS NULL OR length(trim(_token)) < 8 THEN
    RETURN false;
  END IF;

  v_hash := encode(digest(trim(_token), 'sha256'), 'hex');

  SELECT id INTO v_id
  FROM public.admin_invite_tokens
  WHERE token_hash = v_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.admin_invite_tokens
    SET used_at = now(), used_by = auth.uid()
    WHERE id = v_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_admin_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_admin_invite(_label text DEFAULT NULL, _days integer DEFAULT 30)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_token := encode(gen_random_bytes(18), 'hex');

  INSERT INTO public.admin_invite_tokens (token_hash, label, expires_at, created_by)
  VALUES (
    encode(digest(v_token, 'sha256'), 'hex'),
    nullif(trim(coalesce(_label, '')), ''),
    now() + (greatest(1, least(365, coalesce(_days, 30))) || ' days')::interval,
    auth.uid()
  );

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_invite(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_invite(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_admin_role(_user_id uuid, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admins integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  SELECT count(*) INTO v_admins FROM public.user_roles WHERE role = 'admin';
  IF v_admins <= 1 THEN
    RAISE EXCEPTION 'last_admin';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_admin_role(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin_role(uuid, boolean) TO authenticated;