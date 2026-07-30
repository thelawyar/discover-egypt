import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, KeyRound, UserRound, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadBusinessImage } from "@/lib/upload-business-image";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي | اكتشف مدينتك" },
      {
        name: "description",
        content: "إدارة بياناتك الشخصية وصورتك وكلمة المرور في دليل اكتشف مدينتك.",
      },
      { property: "og:title", content: "الملف الشخصي | اكتشف مدينتك" },
      { property: "og:description", content: "إدارة بياناتك الشخصية وكلمة المرور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      avatar_url: avatarUrl,
    });
    setSaving(false);
    if (error) {
      toast.error("تعذّر حفظ البيانات");
      return;
    }
    toast.success("تم حفظ الملف الشخصي");
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
  }

  async function onPickAvatar(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const { url } = await uploadBusinessImage(file, user.id, {
        maxWidth: 512,
        thumbWidth: 128,
        crop: true,
        ratio: 1,
      });
      setAvatarUrl(url);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: url });
      if (error) throw error;
      toast.success("تم تحديث الصورة الشخصية");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changePassword() {
    if (password.length < 8) {
      toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password });
    setChanging(false);
    if (error) {
      toast.error("تعذّر تغيير كلمة المرور");
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("تم تغيير كلمة المرور");
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-extrabold">الملف الشخصي</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          حدّث بياناتك وصورتك الشخصية وكلمة المرور.
        </p>

        {isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-full bg-muted">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName || "الصورة الشخصية"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <UserRound className="size-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onPickAvatar(e.target.files?.[0])}
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
                      <Upload className="size-4" />
                    )}
                    تغيير الصورة
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    PNG أو JPG أو WEBP — حتى 10 ميجابايت.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">الاسم</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    maxLength={100}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="الاسم بالكامل"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={phone}
                    maxLength={20}
                    inputMode="tel"
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
              </div>

              <Button className="mt-5 rounded-full" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                حفظ البيانات
              </Button>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-bold">
                <KeyRound className="size-4" /> تغيير كلمة المرور
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pw">كلمة المرور الجديدة</Label>
                  <Input
                    id="pw"
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw2">تأكيد كلمة المرور</Label>
                  <Input
                    id="pw2"
                    type="password"
                    value={confirm}
                    autoComplete="new-password"
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="mt-5 rounded-full"
                variant="outline"
                onClick={changePassword}
                disabled={changing}
              >
                {changing ? <Loader2 className="size-4 animate-spin" /> : null}
                تحديث كلمة المرور
              </Button>
            </section>
          </div>
        )}
      </div>
    </PageShell>
  );
}
