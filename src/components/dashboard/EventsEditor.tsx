import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

type FormState = {
  id: string | null;
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

const empty: FormState = {
  id: null,
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
};

/** "2026-08-02T18:30" for <input type="datetime-local"> */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Offers & events of a single business, used inside the manage screen. */
export function EventsEditor({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["business-events-editor", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_events")
        .select("*")
        .eq("business_id", businessId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["business-events-editor", businessId] });
    queryClient.invalidateQueries({ queryKey: ["my-events"] });
  };

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        business_id: businessId,
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
      toast.success("تم الحفظ وأُرسلت المناسبة لمراجعة الإدارة");
      setForm(null);
      invalidate();
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
      invalidate();
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
    onSuccess: invalidate,
    onError: () => toast.error("تعذّر تحديث حالة النشر"),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">العروض والأحداث</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            تُراجع الإدارة كل عرض أو حدث جديد قبل ظهوره للزوار.
          </p>
        </div>
        <Button size="sm" className="rounded-full" onClick={() => setForm(empty)}>
          <CalendarPlus className="size-4" /> مناسبة جديدة
        </Button>
      </div>

      {form ? (
        <form
          className="space-y-4 rounded-xl border border-border p-4"
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
            <div>
              <Label>العنوان *</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="خصم 30% على كل المشروبات"
                className="mt-1"
              />
            </div>
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
        <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : events?.length ? (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{e.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {EVENT_KIND_LABELS[e.kind] ?? "حدث"} · {formatEventDate(e.starts_at)}
                </p>
                {e.status === "rejected" && e.rejection_reason ? (
                  <p className="mt-1 text-xs text-destructive">سبب الرفض: {e.rejection_reason}</p>
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
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {e.is_published ? "ظاهر" : "مخفي"}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePublish.mutate({ id: e.id, next: !e.is_published })}
                >
                  {e.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      id: e.id,
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
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          لم تضف أي عرض أو حدث لهذا النشاط بعد.
        </p>
      )}
    </section>
  );
}
