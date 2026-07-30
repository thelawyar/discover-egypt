import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type AdRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
  advertiser: string | null;
  placement: "home" | "search" | "business";
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
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
  priority: 0,
  ends_at: "",
};

const field =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

export function AdminAds() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select(
          "id,title,body,image_url,target_url,advertiser,placement,priority,is_active,starts_at,ends_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.target_url.trim())
        throw new Error("missing");
      const { error } = await supabase.from("ads").insert({
        title: form.title.trim(),
        body: form.body.trim() || null,
        image_url: form.image_url.trim() || null,
        target_url: form.target_url.trim(),
        advertiser: form.advertiser.trim() || null,
        placement: form.placement,
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
          <div>
            <label className="text-xs font-medium text-muted-foreground">رابط الصورة</label>
            <input
              className={field}
              dir="ltr"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
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
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" /> إضافة الإعلان
        </Button>
      </section>

      <section>
        <h2 className="text-sm font-extrabold">الإعلانات المدفوعة</h2>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : !ads?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            لا توجد إعلانات بعد.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="min-w-40 flex-1">
                  <p className="font-bold">{ad.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {PLACEMENTS.find((p) => p.value === ad.placement)?.label} ·{" "}
                    {ad.advertiser ?? "—"} · أولوية {ad.priority}
                    {ad.ends_at
                      ? ` · ينتهي ${new Date(ad.ends_at).toLocaleDateString("ar-EG")}`
                      : ""}
                  </p>
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
            ))}
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
    adsense_every: settings.adsense_every,
  });

  useEffect(() => {
    setForm({
      adsense_enabled: settings.adsense_enabled,
      adsense_client: settings.adsense_client ?? "",
      adsense_slot: settings.adsense_slot ?? "",
      adsense_every: settings.adsense_every,
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .update({
          adsense_enabled: form.adsense_enabled,
          adsense_client: form.adsense_client.trim() || null,
          adsense_slot: form.adsense_slot.trim() || null,
          adsense_every: Math.max(2, Number(form.adsense_every) || 4),
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
            معرّف الوحدة الإعلانية (Slot)
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
            إعلان بعد كل (عدد النتائج)
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

      <Button className="rounded-full" disabled={save.isPending} onClick={() => save.mutate()}>
        حفظ الإعدادات
      </Button>
    </section>
  );
}
