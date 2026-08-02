import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/directory-types";
import { EVENT_KIND_LABELS, formatEventDate } from "@/lib/event-kinds";

const TABS = ["pending", "approved", "rejected"] as const;
type Status = (typeof TABS)[number];

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  starts_at: string;
  status: string;
  is_published: boolean;
  rejection_reason: string | null;
  venue: string | null;
  businesses: { name: string; username: string } | null;
};

/** Admin moderation queue for offers and events before they go public. */
export function AdminEvents() {
  const [tab, setTab] = useState<Status>("pending");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-events", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_events")
        .select(
          "id,title,description,kind,starts_at,status,is_published,rejection_reason,venue,businesses(name,username)",
        )
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: Status; reason?: string | null }) => {
      const { error } = await supabase
        .from("business_events")
        .update({ status: v.status, rejection_reason: v.reason ?? null })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة المناسبة");
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: () => toast.error("تعذّر تحديث المناسبة"),
  });

  return (
    <div className="mt-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
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
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : !data?.length ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          لا توجد عروض أو أحداث في هذه القائمة.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {data.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <CalendarDays className="size-4 text-primary" />
                <span className="text-sm font-bold">{e.title}</span>
                <span className="text-xs text-muted-foreground">
                  {EVENT_KIND_LABELS[e.kind] ?? "حدث"} · {formatEventDate(e.starts_at)}
                </span>
                <span className="text-xs text-muted-foreground">
                  على «{e.businesses?.name ?? "نشاط"}»
                </span>
                {!e.is_published ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    مخفي من صاحب النشاط
                  </span>
                ) : null}
              </div>
              {e.description ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{e.description}</p>
              ) : null}
              {e.rejection_reason ? (
                <p className="mt-2 text-xs text-destructive">سبب الرفض: {e.rejection_reason}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {e.status !== "approved" ? (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStatus.mutate({ id: e.id, status: "approved" })}
                  >
                    <Check className="size-4" /> نشر
                  </Button>
                ) : null}
                {e.status !== "rejected" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      const reason = window.prompt("سبب الرفض (اختياري)") ?? "";
                      setStatus.mutate({
                        id: e.id,
                        status: "rejected",
                        reason: reason.trim() || null,
                      });
                    }}
                  >
                    <X className="size-4" /> رفض
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
