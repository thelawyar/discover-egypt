import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ExternalLink, Pencil, Plus, Settings2, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STATUS_LABELS } from "@/lib/directory-types";
import { StatusNotifications } from "@/components/dashboard/StatusNotifications";
import { ModerationHistory } from "@/components/dashboard/ModerationHistory";
import { QuickEditDialog, type QuickEditBusiness } from "@/components/dashboard/QuickEditDialog";

export const Route = createFileRoute("/_authenticated/dashboard/businesses")({
  head: () => ({
    meta: [
      { title: "أنشطتي حسب الحالة | اكتشف مدينتك" },
      {
        name: "description",
        content: "تابع حالة أنشطتك التجارية: قيد المراجعة أو مقبولة أو مرفوضة، مع التعديل أو السحب.",
      },
      { property: "og:title", content: "أنشطتي حسب الحالة | اكتشف مدينتك" },
      { property: "og:description", content: "متابعة حالة الأنشطة والتعديل أو السحب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyBusinessesPage,
});

type Row = {
  id: string;
  name: string;
  username: string;
  status: string;
  owner_id: string | null;
  rejection_reason: string | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  products: string[] | null;
  cover_image_url: string | null;
  updated_at: string;
  categories: { name: string } | null;
  cities: { name: string } | null;
};

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

const TABS = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة / مسحوبة" },
] as const;

function MyBusinessesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>("pending");
  const [editing, setEditing] = useState<QuickEditBusiness | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-businesses-status", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data: managed } = await supabase
        .from("business_managers")
        .select("business_id")
        .eq("user_id", user!.id);
      const managedIds = (managed ?? []).map((m) => m.business_id);

      const query = supabase
        .from("businesses")
        .select(
          "id,name,username,status,owner_id,rejection_reason,description,phone,address,products,cover_image_url,updated_at,categories(name),cities(name)",
        );

      const { data, error } = await (managedIds.length
        ? query.or(`owner_id.eq.${user!.id},id.in.(${managedIds.join(",")})`)
        : query.eq("owner_id", user!.id)
      ).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("business_withdraw", { _business_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم سحب النشاط من الدليل");
      queryClient.invalidateQueries({ queryKey: ["my-businesses-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
    },
    onError: () => toast.error("تعذّر سحب النشاط"),
  });

  const grouped = useMemo(() => {
    const base: Record<string, Row[]> = { pending: [], approved: [], rejected: [] };
    for (const row of data ?? []) (base[row.status] ??= []).push(row);
    return base;
  }, [data]);

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">أنشطتي حسب الحالة</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              تابع مراجعة الإدارة لكل نشاط، وعدّله أو اسحبه من الدليل في أي وقت.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/dashboard/business/$id" params={{ id: "new" }}>
              <Plus className="size-4" /> أضف نشاطاً
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          <StatusNotifications />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="flex-1 text-xs sm:text-sm">
                {t.label}
                <span className="ms-1 rounded-full bg-muted px-1.5 text-[11px]">
                  {grouped[t.key]?.length ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4 space-y-3">
              {isLoading ? (
                <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
              ) : !grouped[t.key]?.length ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
                  <Store className="size-8 text-muted-foreground" />
                  <p className="text-sm font-semibold">لا توجد أنشطة في هذه الحالة</p>
                </div>
              ) : (
                grouped[t.key].map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {b.cover_image_url ? (
                        <img
                          src={b.cover_image_url}
                          alt={b.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Store className="size-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-40 flex-1">
                      <p className="font-bold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.categories?.name ?? "—"} · {b.cities?.name ?? "—"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[b.status] ?? ""}`}
                    >
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>

                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setEditing(b)}
                      >
                        <Pencil className="size-4" />
                        {b.status === "rejected" ? "طلب التعديل" : "تعديل سريع"}
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link to="/dashboard/business/$id" params={{ id: b.id }}>
                          <Pencil className="size-4" /> التعديل الكامل
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link to="/dashboard/manage/$id" params={{ id: b.id }}>
                          <Settings2 className="size-4" /> إدارة النشاط
                        </Link>
                      </Button>
                      {b.status === "approved" ? (
                        <Button asChild variant="ghost" size="sm" className="rounded-full">
                          <Link to="/$username" params={{ username: b.username }}>
                            <ExternalLink className="size-4" /> الصفحة
                          </Link>
                        </Button>
                      ) : null}
                      {b.status !== "rejected" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-destructive"
                          disabled={withdraw.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                `سحب "${b.name}" من الدليل؟ يمكنك إعادة إرساله للمراجعة لاحقاً بالتعديل عليه.`,
                              )
                            )
                              withdraw.mutate(b.id);
                          }}
                        >
                          <Archive className="size-4" /> سحب
                        </Button>
                      ) : null}
                    </div>

                    <div className="w-full">
                      {b.status === "rejected" ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                          <p className="text-[11px] font-bold text-destructive">
                            سبب الرفض / السحب
                          </p>
                          <p className="mt-1 text-xs text-destructive">
                            {b.rejection_reason?.trim() ||
                              "لم تُسجّل الإدارة سبباً محدداً — راجع البيانات وأعد الإرسال."}
                          </p>
                        </div>
                      ) : null}
                      <ModerationHistory businessId={b.id} />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <QuickEditDialog business={editing} onClose={() => setEditing(null)} />
    </PageShell>
  );
}
