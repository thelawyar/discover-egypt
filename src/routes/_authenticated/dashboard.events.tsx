import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarPlus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EVENT_KINDS,
  EVENT_KIND_LABELS,
  formatEventDate,
  type EventKind,
} from "@/lib/event-kinds";

export const Route = createFileRoute("/_authenticated/dashboard/events")({
  head: () => ({
    meta: [
      { title: "عروضي وأحداثي | اكتشف مدينتك" },
      {
        name: "description",
        content: "أضف عروض وحفلات وافتتاحات ومباريات لنشاطك التجاري.",
      },
      { property: "og:title", content: "عروضي وأحداثي | اكتشف مدينتك" },
      { property: "og:description", content: "إدارة عروض وأحداث نشاطك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardEvents,
});

type FormState = {
  id: string | null;
  business_id: string;
  kind: EventKind;
  title: string;
  description: string;
  image_url: string;
  venue: string;
  external_url: string;
  price_info: string;
  starts_at: string;
  ends_at: string;
  is_published: boolean;
};

const empty = (businessId: string): FormState => ({
  id: null,
  business_id: businessId,
  kind: "offer",
  title: "",
  description: "",
  image_url: "",
  venue: "",
  external_url: "",
  price_info: "",
  starts_at: "",
  ends_at: "",
  is_published: true,
});

/** "2026-08-02T18:30" for <input type="datetime-local"> */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DashboardEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const { data: businesses } = useQuery({
    queryKey: ["my-business-options", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data: managed } = await supabase
        .from("business_managers")
        .select("business_id")
        .eq("user_id", user!.id);
      const ids = (managed ?? []).map((m) => m.business_id);
      const q = supabase.from("businesses").select("id,name,status");
      const { data, error } = await (ids.length
        ? q.or(`owner_id.eq.${user!.id},id.in.(${ids.join(",")})`)
        : q.eq("owner_id", user!.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  const businessIds = (businesses ?? []).map((b) => b.id);

  const { data: events, isLoading } = useQuery({
    queryKey: ["my-events", businessIds.join(",")],
    enabled: businessIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_events")
        .select("*,businesses(name)")
        .in("business_id", businessIds)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        business_id: f.business_id,
        kind: f.kind,
        title: f.title.trim(),
        description: f.description.trim() || null,
        image_url: f.image_url.trim() || null,
        venue: f.venue.trim() || null,
        external_url: f.external_url.trim() || null,
        price_info: f.price_info.trim() || null,
        starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : new Date().toISOString(),
        ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
        is_published: f.is_published,
      };
      const { error } = f.id
        ? await supabase.from("business_events").update(payload).eq("id", f.id)
        : await supabase.from("business_events").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ المناسبة");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: () => toast.error("تعذّر الحفظ، راجع البيانات المطلوبة"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: () => toast.error("تعذّر الحذف"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase
        .from("business_events")
        .update({ is_published: next })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-events"] }),
    onError: () => toast.error("تعذّر تحديث حالة النشر"),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">عروضي وأحداثي</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              أضف عروض اليوم، الحفلات، الافتتاحات والمباريات. تُراجع الإدارة كل عرض أو حدث جديد
              قبل ظهوره للزوار.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/events" search={{ city: "", gov: "", kind: "", when: "upcoming", page: 1 }}>
                عرض الصفحة العامة
              </Link>
            </Button>
            <Button
              className="rounded-full"
              disabled={!businesses?.length}
              onClick={() => setForm(empty(businesses![0].id))}
            >
              <CalendarPlus className="size-4" /> مناسبة جديدة
            </Button>
          </div>
        </div>

        {!businesses?.length ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border py-16 text-center">
            <p className="font-semibold">تحتاج نشاطاً تجارياً أولاً</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/dashboard/business/$id" params={{ id: "new" }}>
                أضف نشاطاً
              </Link>
            </Button>
          </div>
        ) : null}

        {form ? (
          <form
            className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim()) {
                toast.error("العنوان مطلوب");
                return;
              }
              save.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>النشاط</Label>
                <select
                  value={form.business_id}
                  onChange={(e) => set("business_id", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {businesses?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>النوع</Label>
                <select
                  value={form.kind}
                  onChange={(e) => set("kind", e.target.value as EventKind)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {EVENT_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.emoji} {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>العنوان *</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="خصم 30% على كل المشروبات"
                className="mt-1"
              />
            </div>

            <div>
              <Label>الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>يبدأ</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => set("starts_at", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>ينتهي (اختياري)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => set("ends_at", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>المكان (اختياري)</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => set("venue", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>السعر / التذاكر (اختياري)</Label>
                <Input
                  value={form.price_info}
                  onChange={(e) => set("price_info", e.target.value)}
                  placeholder="دخول مجاني"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>رابط صورة (اختياري)</Label>
                <Input
                  value={form.image_url}
                  onChange={(e) => set("image_url", e.target.value)}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>رابط خارجي (اختياري)</Label>
                <Input
                  value={form.external_url}
                  onChange={(e) => set("external_url", e.target.value)}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => set("is_published", e.target.checked)}
              />
              نشر المناسبة للزوار
            </label>

            <div className="flex gap-2">
              <Button type="submit" className="rounded-full" disabled={save.isPending}>
                {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setForm(null)}
              >
                إلغاء
              </Button>
            </div>
          </form>
        ) : null}

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : events?.length ? (
          <div className="mt-6 space-y-3">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{e.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {EVENT_KIND_LABELS[e.kind] ?? "حدث"} · {formatEventDate(e.starts_at)}
                  </p>
                  {e.status === "rejected" && e.rejection_reason ? (
                    <p className="mt-1 text-xs text-destructive">
                      سبب الرفض: {e.rejection_reason}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    e.status === "approved"
                      ? "bg-success/15 text-success"
                      : e.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/15 text-warning-foreground"
                  }`}
                >
                  {e.status === "approved"
                    ? "معتمد"
                    : e.status === "rejected"
                      ? "مرفوض"
                      : "قيد المراجعة"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    e.is_published
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {e.is_published ? "ظاهر" : "مخفي"}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      togglePublish.mutate({ id: e.id, next: !e.is_published })
                    }
                  >
                    {e.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: e.id,
                        business_id: e.business_id,
                        kind: e.kind as EventKind,
                        title: e.title,
                        description: e.description ?? "",
                        image_url: e.image_url ?? "",
                        venue: e.venue ?? "",
                        external_url: e.external_url ?? "",
                        price_info: e.price_info ?? "",
                        starts_at: toLocalInput(e.starts_at),
                        ends_at: toLocalInput(e.ends_at),
                        is_published: e.is_published,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("حذف هذه المناسبة؟")) remove.mutate(e.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : businesses?.length ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            لم تضف أي عرض أو حدث بعد.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
