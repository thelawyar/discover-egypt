import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Store, ListChecks, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/directory-types";
import { ContactNotifications } from "@/components/dashboard/ContactNotifications";
import { MessagesInbox } from "@/components/dashboard/MessagesInbox";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { StatusNotifications } from "@/components/dashboard/StatusNotifications";
import { useBusinessNotifications } from "@/hooks/useBusinessNotifications";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "أنشطتي | اكتشف مدينتك" },
      { name: "description", content: "إدارة أنشطتك التجارية المسجّلة في الدليل." },
      { property: "og:title", content: "أنشطتي | اكتشف مدينتك" },
      { property: "og:description", content: "إدارة أنشطتك التجارية." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Live toast + system notification for new messages/orders.
  useBusinessNotifications();
  // Reminders for events/offers starting soon (owned or saved in my lists).
  useEventReminders();


  const { data, isLoading } = useQuery({
    queryKey: ["my-businesses", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      // Businesses this user was granted edit access to (in addition to owned ones).
      const { data: managed } = await supabase
        .from("business_managers")
        .select("business_id")
        .eq("user_id", user!.id);
      const managedIds = (managed ?? []).map((m) => m.business_id);

      const query = supabase
        .from("businesses")
        .select(
          "id,name,status,owner_id,rejection_reason,cover_image_url,created_at,categories(name),cities(name)",
        );

      const { data, error } = await (managedIds.length
        ? query.or(`owner_id.eq.${user!.id},id.in.(${managedIds.join(",")})`)
        : query.eq("owner_id", user!.id)
      ).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("businesses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف النشاط");
      queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
    },
    onError: () => toast.error("تعذّر حذف النشاط"),
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">أنشطتي التجارية</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              كل نشاط جديد أو معدَّل يمر بمراجعة الإدارة قبل الظهور في الدليل.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/businesses">
                <ListChecks className="size-4" /> أنشطتي حسب الحالة
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/events">🎉 عروضي وأحداثي</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/lists">🔖 قوائمي</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/dashboard/business/$id" params={{ id: "new" }}>
                <Plus className="size-4" /> أضف نشاطاً
              </Link>
            </Button>
          </div>

        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MessagesInbox />
          <div className="space-y-4">
            <StatusNotifications />
            <ContactNotifications />
            <NotificationSettings />
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/dashboard/notifications">
                <Bell className="size-4" /> إعدادات تنبيهات حسابي (داخلي/بريد)
              </Link>
            </Button>
          </div>
        </div>



        {isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : !data?.length ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
            <Store className="size-10 text-muted-foreground" />
            <p className="font-semibold">لم تضف أي نشاط بعد</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/business/$id" params={{ id: "new" }}>
                أضف أول نشاط
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {data.map((b) => {
              const status = b.status as string;
              return (
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
                    <p className="font-bold">
                      {b.name}
                      {b.owner_id !== user?.id ? (
                        <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          صلاحية تعديل
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(b.categories as { name: string } | null)?.name ?? "—"} ·{" "}
                      {(b.cities as { name: string } | null)?.name ?? "—"}
                    </p>
                    {status === "rejected" && b.rejection_reason ? (
                      <p className="mt-1 text-xs text-destructive">
                        سبب الرفض: {b.rejection_reason}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[status] ?? ""}`}
                  >
                    {STATUS_LABELS[status] ?? status}
                  </span>

                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label="تعديل">
                      <Link to="/dashboard/business/$id" params={{ id: b.id }}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    {b.owner_id === user?.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="حذف"
                        onClick={() => {
                          if (confirm(`حذف "${b.name}" نهائياً؟`)) remove.mutate(b.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
