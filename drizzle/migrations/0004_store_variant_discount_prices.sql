ALTER TABLE public.store_variants ADD COLUMN original_price numeric(12,2);
ALTER TABLE public.store_variants ADD CONSTRAINT store_variant_original_price_valid CHECK (original_price IS NULL OR (original_price > 0 AND original_price >= price));
COMMENT ON COLUMN public.store_variants.original_price IS 'Optional price before discount; price remains the final checkout price.';