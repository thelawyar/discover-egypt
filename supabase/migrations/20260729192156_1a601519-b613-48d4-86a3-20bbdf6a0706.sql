-- ========= helpers =========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.make_slug(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(regexp_replace(trim(v), '[()،,\.]', '', 'g'), '\s+', '-', 'g');
$$;

-- ========= roles =========
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========= geography =========
CREATE TABLE public.governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.governorates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.governorates TO authenticated;
GRANT ALL ON public.governorates TO service_role;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "governorates public read" ON public.governorates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "governorates admin write" ON public.governorates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_id uuid NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_new_city boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (governorate_id, name)
);
CREATE INDEX cities_gov_idx ON public.cities(governorate_id);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public read" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cities admin write" ON public.cities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========= categories =========
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========= businesses =========
CREATE TYPE public.business_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  governorate_id uuid REFERENCES public.governorates(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  address text,
  phone text,
  whatsapp text,
  email text,
  website text,
  facebook text,
  instagram text,
  latitude double precision,
  longitude double precision,
  products text[] NOT NULL DEFAULT '{}',
  cover_image_url text,
  status public.business_status NOT NULL DEFAULT 'pending',
  is_featured boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  rejection_reason text,
  search_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX businesses_city_idx ON public.businesses(city_id);
CREATE INDEX businesses_gov_idx ON public.businesses(governorate_id);
CREATE INDEX businesses_cat_idx ON public.businesses(category_id);
CREATE INDEX businesses_status_idx ON public.businesses(status);
CREATE INDEX businesses_owner_idx ON public.businesses(owner_id);
CREATE INDEX businesses_search_idx ON public.businesses USING gin (to_tsvector('simple', search_text));

GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses public read approved" ON public.businesses FOR SELECT TO anon, authenticated
  USING (status = 'approved');
CREATE POLICY "businesses owner read" ON public.businesses FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "businesses owner insert" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "businesses owner update" ON public.businesses FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "businesses owner delete" ON public.businesses FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "businesses admin all" ON public.businesses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_business_moderation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.search_text := coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' '
    || coalesce(NEW.address,'') || ' ' || coalesce(array_to_string(NEW.products,' '),'');
  IF public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.is_featured := false;
  IF TG_OP = 'UPDATE' THEN
    NEW.view_count := OLD.view_count;
    NEW.owner_id := OLD.owner_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER businesses_moderation BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_moderation();

-- ========= images / hours / reviews =========
CREATE TABLE public.business_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_images_biz_idx ON public.business_images(business_id);
GRANT SELECT ON public.business_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_images TO authenticated;
GRANT ALL ON public.business_images TO service_role;
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images public read" ON public.business_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved'));
CREATE POLICY "images owner all" ON public.business_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week int NOT NULL,
  opens_at time,
  closes_at time,
  is_closed boolean NOT NULL DEFAULT false,
  UNIQUE (business_id, day_of_week)
);
GRANT SELECT ON public.business_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hours public read" ON public.business_hours FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved'));
CREATE POLICY "hours owner all" ON public.business_hours FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL,
  comment text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX reviews_biz_idx ON public.reviews(business_id);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved'));
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);
CREATE POLICY "reviews own delete" ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ========= storage policies =========
CREATE POLICY "business images public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'business-images');
CREATE POLICY "business images owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "business images owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "business images owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========= seed: governorates =========
INSERT INTO public.governorates (name, slug, sort_order) VALUES
('القاهرة', public.make_slug('القاهرة'), 1),
('الجيزة', public.make_slug('الجيزة'), 2),
('القليوبية', public.make_slug('القليوبية'), 3),
('الإسكندرية', public.make_slug('الإسكندرية'), 4),
('بورسعيد', public.make_slug('بورسعيد'), 5),
('الإسماعيلية', public.make_slug('الإسماعيلية'), 6),
('السويس', public.make_slug('السويس'), 7),
('الشرقية', public.make_slug('الشرقية'), 8),
('الدقهلية', public.make_slug('الدقهلية'), 9),
('الغربية', public.make_slug('الغربية'), 10),
('المنوفية', public.make_slug('المنوفية'), 11),
('البحيرة', public.make_slug('البحيرة'), 12),
('كفر الشيخ', public.make_slug('كفر الشيخ'), 13),
('دمياط', public.make_slug('دمياط'), 14),
('الفيوم', public.make_slug('الفيوم'), 15),
('بني سويف', public.make_slug('بني سويف'), 16),
('المنيا', public.make_slug('المنيا'), 17),
('أسيوط', public.make_slug('أسيوط'), 18),
('سوهاج', public.make_slug('سوهاج'), 19),
('قنا', public.make_slug('قنا'), 20),
('الأقصر', public.make_slug('الأقصر'), 21),
('أسوان', public.make_slug('أسوان'), 22),
('مطروح', public.make_slug('مطروح'), 23),
('الوادي الجديد', public.make_slug('الوادي الجديد'), 24),
('البحر الأحمر', public.make_slug('البحر الأحمر'), 25),
('شمال سيناء', public.make_slug('شمال سيناء'), 26),
('جنوب سيناء', public.make_slug('جنوب سيناء'), 27);

-- ========= seed: cities =========
INSERT INTO public.cities (governorate_id, name, slug, is_new_city)
SELECT g.id, v.city, public.make_slug(v.city), v.isnew
FROM (VALUES
('القاهرة','القاهرة',false),('حلوان','القاهرة',false),('المعادي','القاهرة',false),('مصر الجديدة','القاهرة',false),
('الجيزة','الجيزة',false),('6 أكتوبر','الجيزة',false),('الشيخ زايد','الجيزة',false),('الحوامدية','الجيزة',false),
('البدرشين','الجيزة',false),('العياط','الجيزة',false),('أطفيح','الجيزة',false),('الصف','الجيزة',false),
('كرداسة','الجيزة',false),('أوسيم','الجيزة',false),('منشأة القناطر','الجيزة',false),('الواحات البحرية','الجيزة',false),
('بنها','القليوبية',false),('شبرا الخيمة','القليوبية',false),('قليوب','القليوبية',false),('القناطر الخيرية','القليوبية',false),
('الخانكة','القليوبية',false),('شبين القناطر','القليوبية',false),('طوخ','القليوبية',false),('قها','القليوبية',false),
('كفر شكر','القليوبية',false),('الخصوص','القليوبية',false),('العبور','القليوبية',false),
('الإسكندرية','الإسكندرية',false),('برج العرب','الإسكندرية',false),
('بورسعيد','بورسعيد',false),('بورفؤاد','بورسعيد',false),
('الإسماعيلية','الإسماعيلية',false),('التل الكبير','الإسماعيلية',false),('فايد','الإسماعيلية',false),
('القنطرة شرق','الإسماعيلية',false),('القنطرة غرب','الإسماعيلية',false),('أبو صوير','الإسماعيلية',false),('القصاصين','الإسماعيلية',false),
('السويس','السويس',false),
('الزقازيق','الشرقية',false),('بلبيس','الشرقية',false),('منيا القمح','الشرقية',false),('فاقوس','الشرقية',false),
('أبو حماد','الشرقية',false),('أولاد صقر','الشرقية',false),('العاشر من رمضان','الشرقية',false),('مشتول السوق','الشرقية',false),
('كفر صقر','الشرقية',false),('أبو كبير','الشرقية',false),('ههيا','الشرقية',false),('الحسينية','الشرقية',false),
('ديرب نجم','الشرقية',false),('الصالحية الجديدة','الشرقية',false),
('المنصورة','الدقهلية',false),('طلخا','الدقهلية',false),('ميت غمر','الدقهلية',false),('دكرنس','الدقهلية',false),
('أجا','الدقهلية',false),('السنبلاوين','الدقهلية',false),('شربين','الدقهلية',false),('المنزلة','الدقهلية',false),
('الجمالية','الدقهلية',false),('بنى عبيد','الدقهلية',false),('بلقاس','الدقهلية',false),('ميت سلسبيل','الدقهلية',false),
('الكردي','الدقهلية',false),('جمصة','الدقهلية',false),('تمي الأمديد','الدقهلية',false),('المطرية','الدقهلية',false),
('محلة دمنة','الدقهلية',false),
('طنطا','الغربية',false),('المحلة الكبرى','الغربية',false),('كفر الزيات','الغربية',false),('زفتى','الغربية',false),
('السنطة','الغربية',false),('قطور','الغربية',false),('بسيون','الغربية',false),('سمنود','الغربية',false),
('شبين الكوم','المنوفية',false),('منوف','المنوفية',false),('مدينة السادات','المنوفية',false),('سرس الليان','المنوفية',false),
('أشمون','المنوفية',false),('الباجور','المنوفية',false),('قويسنا','المنوفية',false),('بركة السبع','المنوفية',false),
('تلا','المنوفية',false),('الشهداء','المنوفية',false),
('دمنهور','البحيرة',false),('كفر الدوار','البحيرة',false),('رشيد','البحيرة',false),('إدكو','البحيرة',false),
('أبو حمص','البحيرة',false),('إيتاي البارود','البحيرة',false),('شبراخيت','البحيرة',false),('كوم حمادة','البحيرة',false),
('بدر','البحيرة',false),('وادي النطرون','البحيرة',false),('دلنجات','البحيرة',false),('حوش عيسى','البحيرة',false),
('أبو المطامير','البحيرة',false),('المحمودية','البحيرة',false),('الرحمانية','البحيرة',false),
('كفر الشيخ','كفر الشيخ',false),('دسوق','كفر الشيخ',false),('فوة','كفر الشيخ',false),('مطوبس','كفر الشيخ',false),
('قلين','كفر الشيخ',false),('سيدي سالم','كفر الشيخ',false),('الرياض','كفر الشيخ',false),('الحامول','كفر الشيخ',false),
('بيلا','كفر الشيخ',false),('بلطيم','كفر الشيخ',false),('برج البرلس','كفر الشيخ',false),('سيدي غازي','كفر الشيخ',false),
('دمياط','دمياط',false),('رأس البر','دمياط',false),('عزبة البرج','دمياط',false),('فارسكور','دمياط',false),
('الروضة','دمياط',false),('الزرقا','دمياط',false),('السرو','دمياط',false),('كفر البطيخ','دمياط',false),
('كفر سعد','دمياط',false),('دمياط الجديدة','دمياط',true),
('الفيوم','الفيوم',false),('طامية','الفيوم',false),('سنورس','الفيوم',false),('إطسا','الفيوم',false),
('أبشواي','الفيوم',false),('يوسف الصديق','الفيوم',false),
('بني سويف','بني سويف',false),('الواسطى','بني سويف',false),('ناصر','بني سويف',false),('ببا','بني سويف',false),
('الفشن','بني سويف',false),('سمسطا','بني سويف',false),('اهناسيا','بني سويف',false),
('المنيا','المنيا',false),('ملوي','المنيا',false),('مغاغة','المنيا',false),('بني مزار','المنيا',false),
('مطاي','المنيا',false),('سمالوط','المنيا',false),('أبو قرقاص','المنيا',false),('دير مواس','المنيا',false),('العدوة','المنيا',false),
('أسيوط','أسيوط',false),('ديروط','أسيوط',false),('القوصية','أسيوط',false),('أبنوب','أسيوط',false),
('منفلوط','أسيوط',false),('أبو تيج','أسيوط',false),('البداري','أسيوط',false),('ساحل سليم','أسيوط',false),
('صدفا','أسيوط',false),('الغنايم','أسيوط',false),('الفتح','أسيوط',false),
('سوهاج','سوهاج',false),('أخميم','سوهاج',false),('طهطا','سوهاج',false),('طما','سوهاج',false),
('جهينة','سوهاج',false),('المراغة','سوهاج',false),('المنشأة','سوهاج',false),('جرجا','سوهاج',false),
('البلينا','سوهاج',false),('دار السلام','سوهاج',false),('ساقلتة','سوهاج',false),
('قنا','قنا',false),('نجع حمادي','قنا',false),('دشنا','قنا',false),('قوص','قنا',false),
('أبو تشت','قنا',false),('فرشوط','قنا',false),('الوقف','قنا',false),('نقادة','قنا',false),('قفط','قنا',false),
('الأقصر','الأقصر',false),('إسنا','الأقصر',false),('أرمنت','الأقصر',false),('البياضية','الأقصر',false),
('الطود','الأقصر',false),('القرنة','الأقصر',false),('الزينية','الأقصر',false),
('أسوان','أسوان',false),('كوم أمبو','أسوان',false),('إدفو','أسوان',false),('نصر النوبة','أسوان',false),
('دراو','أسوان',false),('أبو سمبل','أسوان',false),
('مرسى مطروح','مطروح',false),('الحمام','مطروح',false),('العلمين','مطروح',false),('الضبعة','مطروح',false),
('سيدي براني','مطروح',false),('السلوم','مطروح',false),('سيوة','مطروح',false),('النجيلة','مطروح',false),
('الخارجة','الوادي الجديد',false),('الداخلة','الوادي الجديد',false),('الفرافرة','الوادي الجديد',false),
('باريس','الوادي الجديد',false),('بلاط','الوادي الجديد',false),
('الغردقة','البحر الأحمر',false),('رأس غارب','البحر الأحمر',false),('سفاجا','البحر الأحمر',false),
('القصير','البحر الأحمر',false),('مرسى علم','البحر الأحمر',false),('شلاتين','البحر الأحمر',false),('حلايب','البحر الأحمر',false),
('العريش','شمال سيناء',false),('الشيخ زويد','شمال سيناء',false),('رفح','شمال سيناء',false),('بئر العبد','شمال سيناء',false),
('الحسنة','شمال سيناء',false),('النخل','شمال سيناء',false),
('الطور','جنوب سيناء',false),('شرم الشيخ','جنوب سيناء',false),('دهب','جنوب سيناء',false),('نويبع','جنوب سيناء',false),
('طابا','جنوب سيناء',false),('سانت كاترين','جنوب سيناء',false),('أبو رديس','جنوب سيناء',false),
('أبو زنيمة','جنوب سيناء',false),('رأس سدر','جنوب سيناء',false),
('العاصمة الإدارية الجديدة','القاهرة',true),('حدائق العاصمة','القاهرة',true),
('العلمين الجديدة','مطروح',true),
('المنصورة الجديدة','الدقهلية',true),
('شرق بورسعيد سلام مصر','بورسعيد',true),
('6 أكتوبر الجديدة','الجيزة',true),('حدائق أكتوبر','الجيزة',true),
('امتداد الشيخ زايد زايد الجديدة','الجيزة',true),('سفنكس الجديدة','الجيزة',true),
('العبور الجديدة','القليوبية',true),
('مدينة الجلالة','السويس',true),
('رشيد الجديدة','البحيرة',true),
('الفشن الجديدة','بني سويف',true),
('ملوي الجديدة','المنيا',true),
('ناصر الجديدة غرب أسيوط','أسيوط',true),
('غرب قنا','قنا',true),
('أسوان الجديدة','أسوان',true),('توشكى الجديدة','أسوان',true)
) AS v(city, gov, isnew)
JOIN public.governorates g ON g.name = v.gov
ON CONFLICT (governorate_id, name) DO NOTHING;

-- ========= seed: categories =========
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
('مطاعم وكافيهات', public.make_slug('مطاعم وكافيهات'), 'utensils', 1),
('عيادات ومراكز طبية', public.make_slug('عيادات ومراكز طبية'), 'stethoscope', 2),
('صيدليات', public.make_slug('صيدليات'), 'pill', 3),
('محلات تجارية', public.make_slug('محلات تجارية'), 'store', 4),
('سوبر ماركت وبقالة', public.make_slug('سوبر ماركت وبقالة'), 'shopping-cart', 5),
('ملابس وأحذية', public.make_slug('ملابس وأحذية'), 'shirt', 6),
('مصانع وورش', public.make_slug('مصانع وورش'), 'factory', 7),
('مدارس ومراكز تعليمية', public.make_slug('مدارس ومراكز تعليمية'), 'graduation-cap', 8),
('أكشاك', public.make_slug('أكشاك'), 'box', 9),
('عقارات ومكاتب تسويق', public.make_slug('عقارات ومكاتب تسويق'), 'building-2', 10),
('سيارات وقطع غيار', public.make_slug('سيارات وقطع غيار'), 'car', 11),
('خدمات منزلية وصيانة', public.make_slug('خدمات منزلية وصيانة'), 'wrench', 12),
('صالونات وتجميل', public.make_slug('صالونات وتجميل'), 'scissors', 13),
('محمول وإلكترونيات', public.make_slug('محمول وإلكترونيات'), 'smartphone', 14),
('أثاث ومفروشات', public.make_slug('أثاث ومفروشات'), 'sofa', 15),
('مواد بناء وتشطيبات', public.make_slug('مواد بناء وتشطيبات'), 'hammer', 16),
('مكاتب ومحاماة ومحاسبة', public.make_slug('مكاتب ومحاماة ومحاسبة'), 'briefcase', 17),
('نقل وشحن ومواصلات', public.make_slug('نقل وشحن ومواصلات'), 'truck', 18),
('حلويات ومخبوزات', public.make_slug('حلويات ومخبوزات'), 'cake', 19),
('رياضة وجيم', public.make_slug('رياضة وجيم'), 'dumbbell', 20),
('فنادق وإقامة', public.make_slug('فنادق وإقامة'), 'bed', 21),
('خدمات أخرى', public.make_slug('خدمات أخرى'), 'circle-ellipsis', 22);