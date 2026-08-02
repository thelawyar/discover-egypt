ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status public.business_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.reviews SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS reviews_status_idx ON public.reviews (status, created_at DESC);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Non-admins can never set/keep an approved status themselves
CREATE OR REPLACE FUNCTION public.enforce_review_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.rejection_reason := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_review_moderation_trg ON public.reviews;
CREATE TRIGGER enforce_review_moderation_trg
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_moderation();

DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read" ON public.reviews
FOR SELECT TO anon, authenticated
USING (
  status = 'approved' AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = reviews.business_id AND b.status = 'approved'
  )
);

DROP POLICY IF EXISTS "reviews own read" ON public.reviews;
CREATE POLICY "reviews own read" ON public.reviews
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "reviews own update" ON public.reviews;
CREATE POLICY "reviews own update" ON public.reviews
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  AND rating >= 1 AND rating <= 5
);
