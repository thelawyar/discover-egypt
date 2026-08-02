import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, History, Plus, Star, UserCog, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/directory-types";
import { BackButton } from "@/components/BackButton";
import { BrandingSettings } from "@/components/BrandingSettings";
import { AdminUsers } from "@/components/AdminUsers";
import { AdminCategories } from "@/components/AdminCategories";
import { SeoStatusPanel } from "@/components/SeoStatus";
import { AdminAds } from "@/components/AdminAds";
import { AdminSearchTerms } from "@/components/AdminSearchTerms";
import { AdminInsights } from "@/components/AdminInsights";
import { ModerationLog } from "@/components/AdminModerationLog";
import { AdminReviews } from "@/components/AdminReviews";
import { AdminEvents } from "@/components/AdminEvents";



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
  const [q, setQ] = useState("");
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [view, setView] = useState<
    | "moderation"
    | "reviews"
    | "insights"
    | "categories"
    | "users"
    | "ads"
    | "branding"
    | "seo"
    | "searches"
  >("moderation");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-businesses", tab],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id,name,description,status,is_featured,rejection_reason,created_at,updated_at,cover_image_url,categories(name),cities(name)",
        )
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Queue counters so the admin sees the review backlog at a glance.
  const { data: counts } = useQuery({
    queryKey: ["admin-business-counts"],
    enabled: isAdmin,
    queryFn: async () => {
      const entries = await Promise.all(
        TABS.map(async (s) => {
          const { count } = await supabase
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .eq("status", s);
          return [s, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<(typeof TABS)[number], number>;
    },
  });


  // Simple client-side filter so long lists stay usable on mobile.
  const term = q.trim().toLowerCase();
  const filtered = (data ?? []).filter((b) => {
    if (!term) return true;
    const city = (b.cities as { name: string } | null)?.name ?? "";
    const cat = (b.categories as { name: string } | null)?.name ?? "";
    return `${b.name} ${city} ${cat}`.toLowerCase().includes(term);
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
    onSuccess: (_d, vars) => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-business-counts"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-log", vars.id] });
    },

    onError: () => toast.error("تعذّر التحديث"),
  });
  // Reassign a business to another registered user by email.
  const setOwner = useMutation({
    mutationFn: async (payload: { id: string; email: string }) => {
      const { error } = await supabase.rpc("admin_set_business_owner", {
        _business_id: payload.id,
        _email: payload.email,
      });
      if (error) {
        if (error.message.includes("user_not_found"))
          throw new Error("لا يوجد مستخدم مسجّل بهذا البريد");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم تغيير مالك النشاط");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّر تغيير المالك"),
  });

  function setOwnerFor(id: string) {
    const email = prompt("بريد المالك الجديد (مستخدم مسجّل):")?.trim();
    if (email) setOwner.mutate({ id, email });
  }


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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <BackButton fallback="/" />
            <h1 className="mt-2 text-xl font-extrabold">لوحة الإدارة</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              مراجعة الأنشطة والتصنيفات المرسلة واعتمادها أو رفضها.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/dashboard/business/$id" params={{ id: "new" }}>
              <Plus className="size-4" /> إضافة نشاط
            </Link>
          </Button>
        </div>

        <div className="mt-5 -mx-4 flex gap-2 overflow-x-auto border-b border-border px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {([["moderation", "الأنشطة"], ["reviews", "التقييمات"], ["insights", "الإحصائيات"], ["categories", "التصنيفات"], ["users", "المستخدمون"], ["ads", "الإعلانات"], ["searches", "كلمات البحث"], ["seo", "حالة السيو"], ["branding", "هوية الموقع"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold ${
                view === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ms-auto flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/admin-cities">المحافظات والمدن</Link>
            </Button>
          </div>

        </div>


        {view === "branding" ? <BrandingSettings /> : null}
        {view === "reviews" ? <AdminReviews /> : null}
        {view === "insights" ? <AdminInsights /> : null}
        {view === "users" ? <AdminUsers /> : null}
        {view === "categories" ? <AdminCategories /> : null}
        {view === "ads" ? <AdminAds /> : null}
        {view === "seo" ? <SeoStatusPanel /> : null}
        {view === "searches" ? <AdminSearchTerms /> : null}


        <div className={view !== "moderation" ? "hidden" : "mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary-soft"
              }`}
            >
              {STATUS_LABELS[t]}
              {counts ? ` (${counts[t].toLocaleString("ar-EG")})` : ""}

            </button>
          ))}
        </div>

        {view === "moderation" ? (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم النشاط أو المدينة أو التصنيف"
            className="mt-4 w-full rounded-full border border-border bg-card px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
          />
        ) : null}

        {view !== "moderation" ? null : isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : !filtered.length ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            لا توجد أنشطة مطابقة في هذه القائمة.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((b) => (

              <div
                key={b.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-40 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/business/$id"
                        params={{ id: b.id }}
                        className="font-bold hover:text-primary"
                      >
                        {b.name}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === "approved"
                            ? "bg-success/15 text-success"
                            : b.status === "rejected"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(b.categories as { name: string } | null)?.name ?? "—"} ·{" "}
                      {(b.cities as { name: string } | null)?.name ?? "—"} ·{" "}
                      {new Date(b.created_at as string).toLocaleDateString("ar-EG")}
                    </p>
                    {b.status === "rejected" && b.rejection_reason ? (
                      <p className="mt-1 text-[11px] text-destructive">
                        سبب الرفض: {b.rejection_reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setOpenLog(openLog === b.id ? null : b.id)}
                    >
                      <History className="size-3.5" /> السجل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setOwnerFor(b.id)}
                    >
                      <UserCog className="size-3.5" /> المالك
                    </Button>
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

                    {b.status !== "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => update.mutate({ id: b.id, status: "pending" })}
                      >
                        إعادة للمراجعة
                      </Button>
                    ) : null}
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
                          if (!reason.trim()) {
                            toast.error("سبب الرفض مطلوب");
                            return;
                          }
                          update.mutate({
                            id: b.id,
                            status: "rejected",
                            rejection_reason: reason.slice(0, 300),
                          });
                        }}
                      >
                        <X className="size-3.5" /> رفض
                      </Button>
                    ) : null}
                  </div>
                </div>

                {openLog === b.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <ModerationLog businessId={b.id} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

      </div>
    </PageShell>
  );
}
