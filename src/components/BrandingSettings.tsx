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
          site_name: values.site_name.trim() || "اكتشف مدينتك",
          tagline: values.tagline.trim(),
          logo_url: values.logo_url,
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

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logo-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("branding")
        .createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, logo_url: signed.data.signedUrl }));
      toast.success("تم رفع الشعار، اضغط حفظ للتطبيق");
    } catch {
      toast.error("تعذّر رفع الشعار");
    } finally {
      setUploading(false);
    }
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
              accept="image/*"
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
