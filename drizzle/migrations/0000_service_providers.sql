CREATE TABLE public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  phone text NOT NULL,
  service_type text NOT NULL,
  description text,
  status public.business_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved" ON public.service_providers FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "own read" ON public.service_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin read" ON public.service_providers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user insert pending" ON public.service_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (status = 'pending' OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "admin update" ON public.service_providers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin or own delete" ON public.service_providers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);
CREATE INDEX ON public.service_providers(status, created_at DESC);