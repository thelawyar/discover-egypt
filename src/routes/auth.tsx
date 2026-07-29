import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Brand } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const credentials = z.object({
  email: z.string().trim().email({ message: "بريد إلكتروني غير صالح" }).max(255),
  password: z.string().min(8, { message: "كلمة المرور 8 أحرف على الأقل" }).max(72),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | دَوّر في بلدك" },
      {
        name: "description",
        content: "سجّل الدخول أو أنشئ حساباً لإضافة نشاطك التجاري إلى دليل دَوّر في بلدك.",
      },
      { property: "og:title", content: "تسجيل الدخول | دَوّر في بلدك" },
      { property: "og:description", content: "أضف نشاطك التجاري إلى الدليل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim().slice(0, 100) },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! تفقّد بريدك لتأكيد التسجيل.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error(
        message.includes("Invalid login")
          ? "بيانات الدخول غير صحيحة"
          : message.includes("already registered")
            ? "هذا البريد مسجّل بالفعل"
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("تعذّر تسجيل الدخول عبر جوجل");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link to="/" className="mb-8">
        <Brand size="sm" />
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-raised">
        <h1 className="text-center text-lg font-bold">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          سجّل لإضافة وإدارة أنشطتك التجارية
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full rounded-full"
          onClick={google}
        >
          المتابعة باستخدام جوجل
        </Button>

        <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          أو
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك الكامل"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              maxLength={72}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full rounded-full">
            {busy ? "جارٍ..." : mode === "signin" ? "دخول" : "إنشاء الحساب"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-primary hover:underline"
        >
          {mode === "signin"
            ? "ليس لديك حساب؟ أنشئ حساباً"
            : "لديك حساب بالفعل؟ سجّل الدخول"}
        </button>
      </div>
    </div>
  );
}
