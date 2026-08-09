import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSiteSettings, type SiteSettings } from "@/hooks/useSiteSettings";

const PRESETS = ["#2f6df6", "#0f9d58", "#db4437", "#f4b400", "#7c3aed", "#0f766e"];

export function BrandingSettings() {
  const current = useSiteSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteSettings>(current);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(current);
  }, [current]);

  const save = useMutation({
    mutationFn: async (values: SiteSettings) => {
      const { error } = await supabase
        .from("site_settings")
        .update({
          site_name: values.site_name.trim() || "durtown",
          tagline: values.tagline.trim(),
          logo_url: values.logo_url,
          logo_dark_url: values.logo_dark_url,
          icon_url: values.icon_url,
          hero_title: values.hero_title.trim(),
          hero_subtitle: values.hero_subtitle.trim(),
          primary_color: values.primary_color,
          accent_color: values.accent_color,
        })
        .eq("id", "default");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الهوية");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: () => toast.error("تعذّر الحفظ"),
  });

  /** Validates format, size and dimensions before uploading. */
  async function validateImage(file: File, kind: "logo" | "icon"): Promise<string | null> {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type))
      return "صيغة غير مدعومة — استخدم PNG أو JPG أو WEBP أو SVG.";
    if (file.size > 2 * 1024 * 1024)
      return `حجم الملف ${(file.size / 1024 / 1024).toFixed(1)}MB — الحد الأقصى 2 ميجابايت.`;
    if (file.type === "image/svg+xml") return null;

    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });

    if (!dims) return "تعذّر قراءة الصورة، تأكد أن الملف سليم.";
    if (dims.w > 2000 || dims.h > 2000)
      return `أبعاد الصورة ${dims.w}×${dims.h} كبيرة جداً — الحد الأقصى 2000×2000 بكسل.`;

    if (kind === "icon") {
      if (dims.w < 192 || dims.h < 192)
        return `أيقونة التطبيق ${dims.w}×${dims.h} صغيرة — الحد الأدنى 192×192 بكسل.`;
      if (Math.abs(dims.w - dims.h) / Math.max(dims.w, dims.h) > 0.05)
        return "أيقونة التطبيق يجب أن تكون مربعة (نسبة 1:1).";
      return null;
    }

    if (dims.w < 80 || dims.h < 40)
      return `أبعاد الصورة ${dims.w}×${dims.h} صغيرة جداً — الحد الأدنى 80×40 بكسل.`;
    if (dims.w / dims.h > 8 || dims.h / dims.w > 4)
      return "نسبة أبعاد الشعار غير مناسبة، يفضّل شعاراً أفقياً متوازناً.";
    return null;
  }

  async function uploadImage(
    file: File,
    key: "logo_url" | "logo_dark_url" | "icon_url",
  ) {
    const kind = key === "icon_url" ? "icon" : "logo";
    const problem = await validateImage(file, kind);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(key);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${kind === "icon" ? "icon" : key.replace("_url", "")}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("branding")
        .createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, [key]: signed.data.signedUrl }));
      toast.success("تم الرفع، اضغط حفظ للتطبيق");
    } catch {
      toast.error("تعذّر رفع الصورة");
    } finally {
      setUploading(null);
    }
  }

  function ImageField({
    label,
    hint,
    fieldKey,
    square,
  }: {
    label: string;
    hint: string;
    fieldKey: "logo_url" | "logo_dark_url" | "icon_url";
    square?: boolean;
  }) {
    const value = form[fieldKey];
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {value ? (
            <img
              src={value}
              alt={label}
              className={`${square ? "size-14 object-contain" : "h-14 w-auto"} rounded-lg border border-border bg-background p-1`}
            />
          ) : (
            <span className="text-xs text-muted-foreground">الافتراضي</span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-primary-soft">
            <Upload className="size-3.5" />
            {uploading === fieldKey ? "جارٍ الرفع..." : "رفع صورة"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, fieldKey);
                e.target.value = "";
              }}
            />
          </label>
          {value ? (
            <button
              type="button"
              className="text-xs text-destructive"
              onClick={() => setForm({ ...form, [fieldKey]: null })}
            >
              إزالة
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="mt-6 max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <label className="text-xs font-medium text-muted-foreground">اسم الموقع</label>
        <input
          className={field}
          value={form.site_name}
          onChange={(e) => setForm({ ...form, site_name: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">الوصف / الشعار النصي</label>
        <input
          className={field}
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">شعار الموقع (Logo)</label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          PNG / JPG / WEBP / SVG — حتى 2 ميجابايت، وأبعاد بين 80×40 و2000×2000 بكسل.
        </p>
        <div className="mt-2 flex items-center gap-3">
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt="الشعار"
              className="h-14 w-auto rounded-lg border border-border bg-background p-1"
            />
          ) : (
            <span className="text-xs text-muted-foreground">الشعار الافتراضي</span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-primary-soft">
            <Upload className="size-3.5" />
            {uploading ? "جارٍ الرفع..." : "رفع شعار"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
          </label>
          {form.logo_url ? (
            <button
              type="button"
              className="text-xs text-destructive"
              onClick={() => setForm({ ...form, logo_url: null })}
            >
              إزالة
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">اللون الأساسي</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
            />
            <input
              className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
              value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setForm({ ...form, primary_color: c })}
                className="size-6 rounded-full border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">اللون الفاتح (الخلفيات)</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
            />
            <input
              className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">معاينة مباشرة قبل الحفظ</p>
        <div
          className="mt-2 overflow-hidden rounded-2xl border border-border"
          style={
            {
              "--preview-primary": form.primary_color,
              "--preview-accent": form.accent_color,
            } as React.CSSProperties
          }
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              {form.logo_url ? (
                <img src={form.logo_url} alt="معاينة الشعار" className="h-8 w-auto" />
              ) : null}
              <div className="leading-tight">
                <p className="text-sm font-extrabold">{form.site_name || "اكتشف مدينتك"}</p>
                <p className="text-[10px] text-muted-foreground">{form.tagline}</p>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
              style={{ backgroundColor: "var(--preview-primary)" }}
            >
              إضافة نشاط
            </span>
          </div>
          <div
            className="space-y-3 px-4 py-5"
            style={{ backgroundColor: "var(--preview-accent)" }}
          >
            <div className="rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground">
              ابحث عن نشاط أو منتج أو مجال...
            </div>
            <div className="flex gap-2">
              <span
                className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
                style={{ backgroundColor: "var(--preview-primary)" }}
              >
                بحث
              </span>
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-bold"
                style={{
                  borderColor: "var(--preview-primary)",
                  color: "var(--preview-primary)",
                  backgroundColor: "var(--background)",
                }}
              >
                تصفح المدن
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          className="rounded-full"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          {save.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => setForm(current)}>
          استرجاع
        </Button>
      </div>
    </div>
  );
}
