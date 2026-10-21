import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const TABS = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "rejected", label: "مرفوض" },
] as const;
type Status = (typeof TABS)[number]["value"];

/** Admin moderation for service providers. */
export function AdminServiceProviders() {
  const [tab, setTab] = useState<Status>("pending");
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-service-providers", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id,name,phone,service_type,description,created_at")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-service-providers"] });
    qc.invalidateQueries({ queryKey: ["service-providers"] });
  };
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("service_providers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم التحديث"); refresh(); },
    onError: () => toast.error("تعذر التحديث"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); refresh(); },
  });

  return (
    <div dir="rtl">
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Button key={t.value} size="sm" variant={tab === t.value ? "default" : "outline"} className="rounded-full" onClick={() => setTab(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد عناصر.</p>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border p-4">
              <div>
                <p className="font-bold">{p.service_type} {p.name ? `· ${p.name}` : ""}</p>
                <p className="text-sm" dir="ltr">{p.phone}</p>
                {p.description ? <p className="mt-1 text-sm text-muted-foreground">{p.description}</p> : null}
              </div>
              <div className="flex gap-2">
                {tab !== "approved" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: p.id, status: "approved" })}><Check className="size-4" /> قبول</Button>
                ) : null}
                {tab !== "rejected" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: p.id, status: "rejected" })}><X className="size-4" /> رفض</Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)} aria-label="حذف"><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
