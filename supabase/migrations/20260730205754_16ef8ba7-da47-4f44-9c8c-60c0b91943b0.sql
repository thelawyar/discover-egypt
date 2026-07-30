
ALTER TABLE public.businesses DISABLE TRIGGER USER;
UPDATE public.businesses
   SET status = 'approved',
       search_norm = public.ar_norm(search_text)
 WHERE id = 'f2298fb8-2f88-4da5-9fbf-b23a1d85fe33';
ALTER TABLE public.businesses ENABLE TRIGGER USER;
