import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { REPORT_REASON_LABELS } from "@/components/ReportBusinessButton";

const TABS = [
  { value: "open", label: "جديدة" },
  { value: "resolved", label: "تمت المعالجة" },
  { value: "dismissed", label: "مرفوضة" },
] as const;

type Status = (typeof TABS)[number]["value"];

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  business_id: string;
  businesses: { name: string; username: string } | null;
};

/** Admin moderation queue for visitor reports on business pages. */
export function AdminReports() {
  const [tab, setTab] = useState<Status>("open");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_reports")
        .select("id,reason,details,status,created_at,business_id,businesses(name,username)")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: Status }) => {
      const { error } = await supabase
        .from("business_reports")
        .update({ status: v.status })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة البلاغ");
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: () => toast.error("تعذّر تحديث البلاغ"),
  });

  return (
    <div className="mt-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : !data?.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">لا توجد بلاغات هنا.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Flag className="size-4 text-primary" />
                <span className="text-sm font-bold">
                  {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                </span>
                {r.businesses ? (
                  <Link
                    to="/$username"
                    params={{ username: r.businesses.username }}
                    className="text-xs text-muted-foreground underline"
                  >
                    {r.businesses.name}
                  </Link>
                ) : null}
                <span className="ms-auto text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("ar-EG")}
                </span>
              </div>
              {r.details ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.details}
                </p>
              ) : null}
              {tab === "open" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStatus.mutate({ id: r.id, status: "resolved" })}
                  >
                    <Check className="size-3.5" /> تمت المعالجة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setStatus.mutate({ id: r.id, status: "dismissed" })}
                  >
                    <X className="size-3.5" /> رفض البلاغ
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-full"
                  onClick={() => setStatus.mutate({ id: r.id, status: "open" })}
                >
                  إعادة للمراجعة
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminReports;
