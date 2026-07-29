import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/directory-types";
import { BrandingSettings } from "@/components/BrandingSettings";
import { AdminUsers } from "@/components/AdminUsers";
import { SeoStatusPanel } from "@/components/SeoStatus";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | اكتشف مدينتك" },
      { name: "description", content: "مراجعة واعتماد الأنشطة التجارية." },
      { property: "og:title", content: "لوحة الإدارة | اكتشف مدينتك" },
      { property: "og:description", content: "مراجعة واعتماد الأنشطة التجارية." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const TABS = ["pending", "approved", "rejected"] as const;

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [view, setView] = useState<"moderation" | "users" | "branding">("moderation");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-businesses", tab],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,description,status,is_featured,cover_image_url,categories(name),cities(name)")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: "pending" | "approved" | "rejected";
      is_featured?: boolean;
      rejection_reason?: string | null;
    }) => {
      const { id, ...fields } = payload;
      const { error } = await supabase.from("businesses").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: () => toast.error("تعذّر التحديث"),
  });

  if (loading) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-lg font-bold">هذه الصفحة للإدارة فقط</p>
          <p className="mt-2 text-xs text-muted-foreground">
            لو معك رمز دعوة مسؤول، فعّله من صفحة التفعيل.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild className="rounded-full">
              <Link to="/admin-setup">تفعيل رمز دعوة</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/">العودة للرئيسية</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-extrabold">لوحة الإدارة</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          مراجعة الأنشطة المرسلة واعتمادها أو رفضها.
        </p>

        <div className="mt-5 flex gap-2 border-b border-border pb-3">
          {([["moderation", "الأنشطة"], ["users", "المستخدمون"], ["branding", "هوية الموقع"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                view === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "branding" ? <BrandingSettings /> : null}
        {view === "users" ? <AdminUsers /> : null}

        <div className={view !== "moderation" ? "hidden" : "mt-5 flex gap-2"}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary-soft"
              }`}
            >
              {STATUS_LABELS[t]}
            </button>
          ))}
        </div>

        {view !== "moderation" ? null : isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : !data?.length ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            لا توجد أنشطة في هذه القائمة.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {data.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="min-w-40 flex-1">
                  <Link
                    to="/business/$id"
                    params={{ id: b.id }}
                    className="font-bold hover:text-primary"
                  >
                    {b.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {(b.categories as { name: string } | null)?.name ?? "—"} ·{" "}
                    {(b.cities as { name: string } | null)?.name ?? "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={b.is_featured ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() =>
                      update.mutate({ id: b.id, is_featured: !b.is_featured })
                    }
                  >
                    <Star className="size-3.5" /> مميز
                  </Button>
                  {b.status !== "approved" ? (
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        update.mutate({
                          id: b.id,
                          status: "approved",
                          rejection_reason: null,
                        })
                      }
                    >
                      <Check className="size-3.5" /> اعتماد
                    </Button>
                  ) : null}
                  {b.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-destructive"
                      onClick={() => {
                        const reason = prompt("سبب الرفض؟") ?? "";
                        update.mutate({
                          id: b.id,
                          status: "rejected",
                          rejection_reason: reason.slice(0, 300) || null,
                        });
                      }}
                    >
                      <X className="size-3.5" /> رفض
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
