import { useState } from "react";
import { ImagePlus, Loader2, X, Store, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import {
  THEME_STYLES,
  THEME_FONTS,
  THEME_BUTTONS,
  THEME_PRESETS,
  resolveTheme,
  themeVars,
  isHexColor,
  type ThemeStyleId,
} from "@/lib/business-theme";
import { uploadBusinessImage } from "@/lib/upload-business-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type ThemeValue = {
  logo_url: string | null;
  theme_primary: string | null;
  theme_bg: string | null;
  theme_style: string;
  theme_font: string;
  theme_button: string;
  theme_contrast: boolean;
};

/** Theme customization for the public mini-site, with an instant live preview. */
export function ThemeEditor({
  value,
  onChange,
  userId,
  businessName,
  coverUrl,
}: {
  value: ThemeValue;
  onChange: (patch: Partial<ThemeValue>) => void;
  userId: string;
  businessName: string;
  coverUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const theme = resolveTheme(value);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const { url } = await uploadBusinessImage(file, userId, { maxWidth: 512 });
      onChange({ logo_url: url });
      toast.success("تم رفع الشعار");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الشعار");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="text-sm font-bold">مظهر صفحة النشاط</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          خصّص ألوان وخلفية وشعار صفحتك العامة، والمعاينة تتحدث فوراً قبل الحفظ.
        </p>
      </div>

      <div className="space-y-2">
        <Label>النمط</Label>
        <div className="flex flex-wrap gap-2">
          {THEME_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ theme_style: s.id as ThemeStyleId })}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
                value.theme_style === s.id
                  ? "border-primary bg-primary-soft text-accent-foreground"
                  : "border-border"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>الخط</Label>
          <div className="flex flex-wrap gap-2">
            {THEME_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ theme_font: f.id })}
                style={{ fontFamily: f.family }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  theme.font === f.id
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>نمط الأزرار</Label>
          <div className="flex flex-wrap gap-2">
            {THEME_BUTTONS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onChange({ theme_button: b.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  theme.button === b.id
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <span>
          <span className="block text-xs font-semibold">تحسين التباين</span>
          <span className="block text-[11px] text-muted-foreground">
            ألوان أوضح ونصوص أعلى تباينًا لسهولة القراءة.
          </span>
        </span>
        <input
          type="checkbox"
          className="size-4"
          checked={value.theme_contrast}
          onChange={(e) => onChange({ theme_contrast: e.target.checked })}
        />
      </label>

      <div className="space-y-2">
        <Label>ألوان جاهزة</Label>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-label={p.label}
              onClick={() => onChange({ theme_primary: p.primary, theme_bg: p.bg })}
              className="size-8 rounded-full border border-border"
              style={{ background: p.primary }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="theme_primary">اللون الأساسي</Label>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="اختيار اللون الأساسي"
              value={theme.primary}
              onChange={(e) => onChange({ theme_primary: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
            />
            <Input
              id="theme_primary"
              dir="ltr"
              value={value.theme_primary ?? ""}
              placeholder={theme.primary}
              maxLength={7}
              onChange={(e) => onChange({ theme_primary: e.target.value || null })}
            />
          </div>
          {value.theme_primary && !isHexColor(value.theme_primary) ? (
            <p className="text-[11px] text-destructive">اكتب اللون بصيغة #RRGGBB</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="theme_bg">لون الخلفية</Label>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="اختيار لون الخلفية"
              value={theme.bg}
              onChange={(e) => onChange({ theme_bg: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
            />
            <Input
              id="theme_bg"
              dir="ltr"
              value={value.theme_bg ?? ""}
              placeholder={theme.bg}
              maxLength={7}
              onChange={(e) => onChange({ theme_bg: e.target.value || null })}
            />
          </div>
          {value.theme_bg && !isHexColor(value.theme_bg) ? (
            <p className="text-[11px] text-destructive">اكتب اللون بصيغة #RRGGBB</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>شعار النشاط</Label>
        <div className="flex items-center gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
            {value.logo_url ? (
              <img
                src={value.logo_url}
                alt="شعار النشاط"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Store className="size-5" />
              </div>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted">
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            {uploading ? "جارٍ الرفع..." : "رفع شعار"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
              }}
            />
          </label>
          {value.logo_url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => onChange({ logo_url: null })}
            >
              <X className="size-3.5" /> إزالة
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>معاينة مباشرة</Label>
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ ...themeVars(theme), borderColor: "var(--biz-border)" }}
        >
          <div
            className="relative aspect-[21/9] w-full"
            style={{ background: "var(--biz-card)" }}
          >
            {coverUrl ? (
              <img src={coverUrl} alt="" className="size-full object-cover" />
            ) : null}
            {value.logo_url ? (
              <img
                src={value.logo_url}
                alt=""
                className="absolute bottom-2 start-3 size-12 rounded-xl border-2 object-cover"
                style={{ borderColor: "var(--biz-card)" }}
              />
            ) : null}
          </div>
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold">{businessName || "اسم النشاط"}</p>
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: "var(--biz-soft)" }}
              >
                التصنيف
              </span>
              <Star className="size-3 fill-warning text-warning" />
            </div>
            <p className="text-xs" style={{ color: "var(--biz-muted)" }}>
              نبذة قصيرة عن النشاط تظهر هنا لزوار صفحتك.
            </p>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
              style={
                theme.buttonOutlined
                  ? {
                      borderRadius: "var(--biz-btn-radius)",
                      border: "1.5px solid var(--biz-primary)",
                    }
                  : {
                      borderRadius: "var(--biz-btn-radius)",
                      background: "var(--biz-soft)",
                    }
              }
            >
              <Phone className="size-3.5" style={{ color: "var(--biz-primary)" }} />
              اتصل بنا
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
