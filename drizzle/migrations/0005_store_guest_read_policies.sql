ALTER POLICY "store settings read" ON public.store_settings TO authenticated;
ALTER POLICY "store products read" ON public.store_products TO authenticated;
ALTER POLICY "store variants read" ON public.store_variants TO authenticated;
ALTER POLICY "store shipping read" ON public.store_shipping_methods TO authenticated;
CREATE POLICY "store settings guest read" ON public.store_settings FOR SELECT TO anon USING (public.store_is_public(business_id));
CREATE POLICY "store products guest read" ON public.store_products FOR SELECT TO anon USING (is_active AND public.store_is_public(business_id));
CREATE POLICY "store variants guest read" ON public.store_variants FOR SELECT TO anon USING (public.store_is_public(business_id));
CREATE POLICY "store shipping guest read" ON public.store_shipping_methods FOR SELECT TO anon USING (is_active AND public.store_is_public(business_id));