import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type JobRow = {
  id: string;
  title: string;
  description: string | null;
  employment_type: string | null;
  salary_range: string | null;
  contact: string | null;
  is_active: boolean;
};

const EMPTY = {
  title: "",
  description: "",
  employment_type: "",
  salary_range: "",
  contact: "",
};

/**
 * Simple hiring section: owners list the roles they need. Any active job
 * flips the business "يوظّف" badge shown in search results (DB trigger).
 */
export function JobsEditor({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(EMPTY);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["business-jobs", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_jobs")
        .select("id,title,description,employment_type,salary_range,contact,is_active")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobRow[];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["business-jobs", businessId] });
  }

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("business_jobs").insert({
        business_id: businessId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        employment_type: draft.employment_type.trim() || null,
        salary_range: draft.salary_range.trim() || null,
        contact: draft.contact.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(EMPTY);
      toast.success("تمت إضافة الوظيفة");
      invalidate();
    },
    onError: () => toast.error("تعذّرت إضافة الوظيفة"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("business_jobs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("تعذّر تحديث الوظيفة"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الوظيفة");
      invalidate();
    },
    onError: () => toast.error("تعذّر حذف الوظيفة"),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <BriefcaseBusiness className="size-4 text-primary" />
        <h2 className="text-sm font-bold">الوظائف المطلوبة</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        أضف الوظائف التي تحتاجها، وسيظهر نشاطك في نتائج البحث بعلامة «يوظّف».
      </p>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
        ) : !jobs?.length ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            لا توجد وظائف مضافة بعد
          </p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-bold">{job.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[job.employment_type, job.salary_range, job.contact]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {job.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{job.description}</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-[11px]">
                <Switch
                  checked={job.is_active}
                  onCheckedChange={(v) => toggle.mutate({ id: job.id, is_active: v })}
                />
                {job.is_active ? "متاحة" : "موقوفة"}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-destructive"
                onClick={() => remove.mutate(job.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="المسمى الوظيفي (مثال: كاشير)"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <Input
          placeholder="نوع الدوام (دوام كامل / جزئي)"
          value={draft.employment_type}
          onChange={(e) => setDraft({ ...draft, employment_type: e.target.value })}
        />
        <Input
          placeholder="الراتب (اختياري)"
          value={draft.salary_range}
          onChange={(e) => setDraft({ ...draft, salary_range: e.target.value })}
        />
        <Input
          placeholder="وسيلة التقديم (رقم / بريد)"
          value={draft.contact}
          onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
        />
        <Textarea
          placeholder="تفاصيل الوظيفة (اختياري)"
          className="sm:col-span-2"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          className="rounded-full"
          disabled={!draft.title.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          <Plus className="size-4" /> إضافة وظيفة
        </Button>
      </div>
    </section>
  );
}
