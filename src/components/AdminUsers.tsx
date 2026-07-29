import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
};

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const setRole = useMutation({
    mutationFn: async (vars: { userId: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_admin_role", {
        _user_id: vars.userId,
        _grant: vars.grant,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: { message?: string }) =>
      toast.error(
        error?.message?.includes("last_admin")
          ? "لا يمكن سحب الصلاحية من آخر مسؤول في الموقع"
          : "تعذّر تحديث الصلاحيات",
      ),
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_admin_invite", {
        _label: "دعوة من لوحة الإدارة",
        _days: 30,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) => {
      setNewToken(token);
      toast.success("تم إنشاء رمز دعوة جديد — انسخه الآن");
    },
    onError: () => toast.error("تعذّر إنشاء رمز الدعوة"),
  });

  const term = search.trim().toLowerCase();
  const rows = (users.data ?? []).filter(
    (u) =>
      !term ||
      u.email?.toLowerCase().includes(term) ||
      u.full_name?.toLowerCase().includes(term),
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو البريد الإلكتروني"
          className="min-w-52 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <Button
          variant="outline"
          className="rounded-full"
          disabled={createInvite.isPending}
          onClick={() => createInvite.mutate()}
        >
          <KeyRound className="size-3.5" /> إنشاء رمز دعوة مسؤول
        </Button>
      </div>

      {newToken ? (
        <div className="rounded-2xl border border-primary/40 bg-primary-soft p-4">
          <p className="text-xs font-bold">
            رمز الدعوة (يظهر مرة واحدة فقط، صالح 30 يوماً ولمرة استخدام واحدة):
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-background px-3 py-2 text-sm" dir="ltr">
              {newToken}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                navigator.clipboard?.writeText(newToken);
                toast.success("تم النسخ");
              }}
            >
              <Copy className="size-3.5" /> نسخ
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            يستخدمه صاحب الحساب من صفحة <span dir="ltr">/admin-setup</span> بعد تسجيل الدخول.
          </p>
        </div>
      ) : null}

      {users.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : users.isError ? (
        <p className="py-16 text-center text-sm text-destructive">تعذّر تحميل المستخدمين.</p>
      ) : !rows.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">لا يوجد مستخدمون.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-40 flex-1">
                <p className="font-bold">{u.full_name || "بدون اسم"}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {u.email ?? "—"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  انضم: {fmt(u.created_at)} · آخر دخول: {fmt(u.last_sign_in_at)}
                </p>
              </div>

              {u.is_admin ? (
                <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
                  مسؤول
                </span>
              ) : null}

              <Button
                size="sm"
                variant={u.is_admin ? "outline" : "default"}
                className={`rounded-full ${u.is_admin ? "text-destructive" : ""}`}
                disabled={setRole.isPending || (u.is_admin && u.id === user?.id)}
                onClick={() => setRole.mutate({ userId: u.id, grant: !u.is_admin })}
              >
                {u.is_admin ? (
                  <>
                    <ShieldOff className="size-3.5" /> سحب الصلاحية
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-3.5" /> تعيين مسؤول
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
