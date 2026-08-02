import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/directory-types";

const TABS = ["pending", "approved", "rejected"] as const;
type Status = (typeof TABS)[number];

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  businesses: { name: string; username: string } | null;
};

/** Admin moderation queue for customer reviews. */
export function AdminReviews() {
  const [tab, setTab] = useState<Status>("pending");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id,rating,comment,author_name,status,rejection_reason,created_at,businesses(name,username)",
        )
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: Status; reason?: string | null }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ status: v.status, rejection_reason: v.reason ?? null })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة التقييم");
      void queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error("تعذّر تحديث التقييم"),
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
          لا توجد تقييمات في هذه القائمة.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {data.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < r.rating ? "size-3.5 fill-warning text-warning" : "size-3.5 opacity-30"
                      }
                    />
                  ))}
                </span>
                <span className="text-sm font-bold">{r.author_name ?? "زائر"}</span>
                <span className="text-xs text-muted-foreground">
                  على «{r.businesses?.name ?? "نشاط"}»
                </span>
                <span className="ms-auto text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar-EG")}
                </span>
              </div>
              {r.comment ? <p className="mt-2 text-sm">{r.comment}</p> : null}
              {r.rejection_reason ? (
                <p className="mt-2 text-xs text-destructive">سبب الرفض: {r.rejection_reason}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "approved" ? (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStatus.mutate({ id: r.id, status: "approved" })}
                  >
                    <Check className="size-4" /> نشر
                  </Button>
                ) : null}
                {r.status !== "rejected" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      const reason = window.prompt("سبب الرفض (اختياري)") ?? "";
                      setStatus.mutate({
                        id: r.id,
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
