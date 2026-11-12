ALTER TABLE public.store_products ADD COLUMN search_norm text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.update_store_product_search_norm() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ BEGIN NEW.search_norm := public.ar_norm(NEW.name || ' ' || coalesce(NEW.description, '')); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.update_store_product_search_norm() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER store_product_search_norm BEFORE INSERT OR UPDATE OF name, description ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_store_product_search_norm();
UPDATE public.store_products SET search_norm = public.ar_norm(name || ' ' || coalesce(description, ''));
CREATE INDEX store_products_search_norm_idx ON public.store_products USING gin (search_norm extensions.gin_trgm_ops);