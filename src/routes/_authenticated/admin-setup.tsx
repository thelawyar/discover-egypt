import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin-setup")({
  head: () => ({
    meta: [
      { title: "تفعيل حساب مسؤول | اكتشف مدينتك" },
      { name: "description", content: "استخدم رمز الدعوة لتفعيل صلاحية الإدارة." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const { isAdmin, user } = useAuth();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function claim() {
    const value = token.trim();
    if (value.length < 8) {
      toast.error("رمز الدعوة غير صالح");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("claim_admin_invite", { _token: value });
      if (error) throw error;
      if (!data) {
        toast.error("الرمز غير صحيح أو مستخدم من قبل أو منتهي الصلاحية");
        return;
      }
      toast.success("تم تفعيل صلاحية الإدارة لحسابك");
      queryClient.invalidateQueries();
      navigate({ to: "/admin" });
    } catch {
      toast.error("تعذّر تفعيل الصلاحية، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h1 className="text-lg font-extrabold">تفعيل حساب مسؤول</h1>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            أدخل رمز الدعوة لمرة واحدة لتفعيل صلاحية الإدارة على حسابك
            {user?.email ? ` (${user.email})` : ""}.
          </p>

          {isAdmin ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-primary">حسابك مسؤول بالفعل ✅</p>
              <Button asChild className="rounded-full">
                <Link to="/admin">فتح لوحة الإدارة</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <input
                dir="ltr"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="invite token"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <Button className="w-full rounded-full" disabled={busy} onClick={claim}>
                {busy ? "جارٍ التفعيل..." : "تفعيل الصلاحية"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
