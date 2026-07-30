import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { optimizeImage } from "@/lib/image-optimize";
import { AD_PAGE_LABELS, parseAdPositions } from "@/lib/ads-config";

type AdRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
  advertiser: string | null;
  placement: "home" | "search" | "business";
  governorate_id: string | null;
  city_id: string | null;
  category_id: string | null;
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  impression_count: number;
  click_count: number;
};

const PLACEMENTS: { value: AdRow["placement"]; label: string }[] = [
  { value: "search", label: "نتائج البحث" },
  { value: "home", label: "الصفحة الرئيسية" },
  { value: "business", label: "صفحة النشاط" },
];

const emptyForm = {
  title: "",
  body: "",
  image_url: "",
  target_url: "",
  advertiser: "",
  placement: "search" as AdRow["placement"],
  governorate_id: "",
  city_id: "",
  category_id: "",
  priority: 0,
  ends_at: "",
};

const field =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

function useTaxonomy() {
  return useQuery({
    queryKey: ["ads-taxonomy"],
    staleTime: 300_000,
    queryFn: async () => {
      const [g, c, cat] = await Promise.all([
        supabase.from("governorates").select("id,name").order("sort_order"),
        supabase.from("cities").select("id,name,governorate_id").order("name"),
        supabase.from("categories").select("id,name").eq("status", "approved").order("name"),
      ]);
      if (g.error) throw g.error;
      if (c.error) throw c.error;
      if (cat.error) throw cat.error;
      return {
        governorates: g.data ?? [],
        cities: c.data ?? [],
        categories: cat.data ?? [],
      };
    },
  });
}

export function AdminAds() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: taxonomy } = useTaxonomy();

  const cityOptions = useMemo(
    () =>
      (taxonomy?.cities ?? []).filter(
        (c) => !form.governorate_id || c.governorate_id === form.governorate_id,
      ),
    [taxonomy, form.governorate_id],
  );

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select(
          "id,title,body,image_url,target_url,advertiser,placement,governorate_id,city_id,category_id,priority,is_active,starts_at,ends_at,impression_count,click_count",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdRow[];
    },
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const optimized = await optimizeImage(file, { maxWidth: 1200, quality: 0.82 });
      const path = `ads/${crypto.randomUUID()}.${optimized.ext}`;
      const up = await supabase.storage.from("branding").upload(path, optimized.blob, {
        contentType: optimized.contentType,
        upsert: true,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("branding")
        .createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (signed.error || !signed.data?.signedUrl) throw signed.error;
      setForm((f) => ({ ...f, image_url: signed.data.signedUrl }));
      toast.success("تم رفع صورة الإعلان");
    } catch {
      toast.error("تعذّر رفع الصورة، جرّب صورة أخرى");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.target_url.trim()) throw new Error("missing");
      const { error } = await supabase.from("ads").insert({
        title: form.title.trim(),
        body: form.body.trim() || null,
        image_url: form.image_url.trim() || null,
        target_url: form.target_url.trim(),
        advertiser: form.advertiser.trim() || null,
        placement: form.placement,
        governorate_id: form.governorate_id || null,
        city_id: form.city_id || null,
        category_id: form.category_id || null,
        priority: Number(form.priority) || 0,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة الإعلان");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
    },
    onError: () => toast.error("تأكد من العنوان والرابط المستهدف"),
  });

  const update = useMutation({
    mutationFn: async (p: { id: string; is_active?: boolean }) => {
      const { id, ...fields } = p;
      const { error } = await supabase.from("ads").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
    },
    onError: () => toast.error("تعذّر التحديث"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الإعلان");
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
    },
    onError: () => toast.error("تعذّر الحذف"),
  });

  const nameOf = (list: { id: string; name: string }[] | undefined, id: string | null) =>
    id ? (list?.find((x) => x.id === id)?.name ?? "—") : null;

  return (
    <div className="mt-6 space-y-8">
      <section className="max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-extrabold">إضافة إعلان مدفوع</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">عنوان الإعلان</label>
            <input
              className={field}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">اسم المعلن</label>
            <input
              className={field}
              value={form.advertiser}
              onChange={(e) => setForm({ ...form, advertiser: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">نص مختصر</label>
            <input
              className={field}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">صورة الإعلان</label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                رفع صورة من الجهاز
              </Button>
              {form.image_url ? (
                <div className="flex items-center gap-2">
                  <img
                    src={form.image_url}
                    alt="معاينة الإعلان"
                    className="h-14 w-24 rounded-lg border border-border object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full text-destructive"
                    onClick={() => setForm({ ...form, image_url: "" })}
                  >
                    <X className="size-3.5" /> إزالة
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  PNG أو JPG أو WEBP — يتم ضغطها تلقائياً.
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">الرابط المستهدف</label>
            <input
              className={field}
              dir="ltr"
              placeholder="https://"
              value={form.target_url}
              onChange={(e) => setForm({ ...form, target_url: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">مكان الظهور</label>
            <select
              className={field}
              value={form.placement}
              onChange={(e) =>
                setForm({ ...form, placement: e.target.value as AdRow["placement"] })
              }
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              استهداف المحافظة
            </label>
            <select
              className={field}
              value={form.governorate_id}
              onChange={(e) =>
                setForm({ ...form, governorate_id: e.target.value, city_id: "" })
              }
            >
              <option value="">كل المحافظات</option>
              {taxonomy?.governorates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">استهداف المدينة</label>
            <select
              className={field}
              value={form.city_id}
              disabled={!form.governorate_id}
              onChange={(e) => setForm({ ...form, city_id: e.target.value })}
            >
              <option value="">
                {form.governorate_id ? "كل مدن المحافظة" : "اختر المحافظة أولاً"}
              </option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              استهداف مجال النشاط
            </label>
            <select
              className={field}
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">كل التصنيفات</option>
              {taxonomy?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">الأولوية</label>
              <input
                type="number"
                className={field}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ينتهي في</label>
              <input
                type="date"
                className={field}
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
          </div>
        </div>
        <Button
          className="rounded-full"
          disabled={create.isPending || uploading}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" /> إضافة الإعلان
        </Button>
      </section>

      <section>
        <h2 className="text-sm font-extrabold">الإعلانات المدفوعة والتقارير</h2>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : !ads?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            لا توجد إعلانات بعد.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {ads.map((ad) => {
              const ctr = ad.impression_count
                ? ((ad.click_count / ad.impression_count) * 100).toFixed(1)
                : "0.0";
              const targets = [
                nameOf(taxonomy?.governorates, ad.governorate_id),
                nameOf(taxonomy?.cities, ad.city_id),
                nameOf(taxonomy?.categories, ad.category_id),
              ].filter(Boolean);
              return (
                <div
                  key={ad.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  {ad.image_url ? (
                    <img
                      src={ad.image_url}
                      alt=""
                      className="h-12 w-20 rounded-lg border border-border object-cover"
                    />
                  ) : null}
                  <div className="min-w-40 flex-1">
                    <p className="font-bold">{ad.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {PLACEMENTS.find((p) => p.value === ad.placement)?.label} ·{" "}
                      {ad.advertiser ?? "—"} · أولوية {ad.priority}
                      {ad.ends_at
                        ? ` · ينتهي ${new Date(ad.ends_at).toLocaleDateString("ar-EG")}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      استهداف: {targets.length ? targets.join(" · ") : "عام (بدون استهداف)"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2 text-center text-xs">
                    <p className="font-bold">{ad.impression_count.toLocaleString("ar-EG")}</p>
                    <p className="text-muted-foreground">ظهور</p>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2 text-center text-xs">
                    <p className="font-bold">{ad.click_count.toLocaleString("ar-EG")}</p>
                    <p className="text-muted-foreground">نقرة</p>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2 text-center text-xs">
                    <p className="font-bold">{ctr}%</p>
                    <p className="text-muted-foreground">CTR</p>
                  </div>
                  <Button
                    size="sm"
                    variant={ad.is_active ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => update.mutate({ id: ad.id, is_active: !ad.is_active })}
                  >
                    {ad.is_active ? "مفعّل" : "متوقف"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-destructive"
                    onClick={() => remove.mutate(ad.id)}
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <GoogleAdsSettings />
    </div>
  );
}

function GoogleAdsSettings() {
  const settings = useSiteSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    adsense_enabled: settings.adsense_enabled,
    adsense_client: settings.adsense_client ?? "",
    adsense_slot: settings.adsense_slot ?? "",
    adsense_slot_search: settings.adsense_slot_search ?? "",
    adsense_slot_business: settings.adsense_slot_business ?? "",
    adsense_every: settings.adsense_every,
    ad_positions: settings.ad_positions ?? "",
  });

  useEffect(() => {
    setForm({
      adsense_enabled: settings.adsense_enabled,
      adsense_client: settings.adsense_client ?? "",
      adsense_slot: settings.adsense_slot ?? "",
      adsense_slot_search: settings.adsense_slot_search ?? "",
      adsense_slot_business: settings.adsense_slot_business ?? "",
      adsense_every: settings.adsense_every,
      ad_positions: settings.ad_positions ?? "",
    });
  }, [settings]);

  const positions = parseAdPositions(form.ad_positions);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .update({
          adsense_enabled: form.adsense_enabled,
          adsense_client: form.adsense_client.trim() || null,
          adsense_slot: form.adsense_slot.trim() || null,
          adsense_slot_search: form.adsense_slot_search.trim() || null,
          adsense_slot_business: form.adsense_slot_business.trim() || null,
          adsense_every: Math.max(2, Number(form.adsense_every) || 4),
          ad_positions: positions.join(","),
        })
        .eq("id", "default");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات إعلانات جوجل");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: () => toast.error("تعذّر الحفظ"),
  });

  return (
    <section className="max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="text-sm font-extrabold">إعلانات جوجل (AdSense)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          تظهر بين نتائج البحث بنفس شكل الكروت مع كتابة «إعلان جوجل» بخط صغير داخل الإطار.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.adsense_enabled}
          onChange={(e) => setForm({ ...form, adsense_enabled: e.target.checked })}
        />
        تفعيل إعلانات جوجل
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            معرّف الناشر (ca-pub-...)
          </label>
          <input
            className={field}
            dir="ltr"
            placeholder="ca-pub-0000000000000000"
            value={form.adsense_client}
            onChange={(e) => setForm({ ...form, adsense_client: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            الوحدة الافتراضية (Slot)
          </label>
          <input
            className={field}
            dir="ltr"
            value={form.adsense_slot}
            onChange={(e) => setForm({ ...form, adsense_slot: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            وحدة {AD_PAGE_LABELS.search}
          </label>
          <input
            className={field}
            dir="ltr"
            value={form.adsense_slot_search}
            onChange={(e) => setForm({ ...form, adsense_slot_search: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            وحدة {AD_PAGE_LABELS.business}
          </label>
          <input
            className={field}
            dir="ltr"
            value={form.adsense_slot_business}
            onChange={(e) => setForm({ ...form, adsense_slot_business: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            مواضع الإعلان بين النتائج (مثال: 3,6)
          </label>
          <input
            className={field}
            dir="ltr"
            placeholder="3,6"
            value={form.ad_positions}
            onChange={(e) => setForm({ ...form, ad_positions: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            بديل: إعلان بعد كل (عدد النتائج)
          </label>
          <input
            type="number"
            min={2}
            className={field}
            value={form.adsense_every}
            onChange={(e) => setForm({ ...form, adsense_every: Number(e.target.value) })}
          />
        </div>
      </div>

      <PositionsPreview positions={positions} every={Number(form.adsense_every) || 4} />

      <Button className="rounded-full" disabled={save.isPending} onClick={() => save.mutate()}>
        حفظ الإعدادات
      </Button>
    </section>
  );
}

/** Live preview of where ads land between results before saving. */
function PositionsPreview({ positions, every }: { positions: number[]; every: number }) {
  const total = 9;
  const slots = positions.length
    ? positions
    : Array.from({ length: Math.floor(total / Math.max(2, every)) }, (_, i) => (i + 1) * Math.max(2, every));

  const rows: { kind: "result" | "ad"; n: number }[] = [];
  for (let i = 1; i <= total; i++) {
    rows.push({ kind: "result", n: i });
    if (slots.includes(i)) rows.push({ kind: "ad", n: i });
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-bold">معاينة مباشرة لترتيب الإعلانات</p>
      <div className="flex flex-wrap gap-2">
        {rows.map((r, i) =>
          r.kind === "result" ? (
            <span
              key={`r-${i}`}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground"
            >
              نتيجة {r.n}
            </span>
          ) : (
            <span
              key={`a-${i}`}
              className="rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-warning-foreground"
            >
              إعلان
            </span>
          ),
        )}
      </div>
    </div>
  );
}
