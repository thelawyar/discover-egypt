import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type LogRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  created_at: string;
};

function labelFor(row: LogRow) {
  if (row.to_status === "approved") return "تمت الموافقة ونشر النشاط";
  if (row.to_status === "rejected") return "تم الرفض أو سحب النشاط";
  if (row.from_status === null) return "إرسال النشاط لأول مرة";
  return "تعديل مُرسل للمراجعة";
}

/** Timeline of moderation decisions and submitted edits for one business. */
export function ModerationHistory({ businessId }: { businessId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["business-moderation-log", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_moderation_log")
        .select("id,from_status,to_status,reason,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold">
        <History className="size-3.5" /> سجل المراجعة والتعديلات المرسلة
      </p>
      {isLoading ? (
        <p className="mt-2 text-[11px] text-muted-foreground">جارٍ التحميل...</p>
      ) : !data?.length ? (
        <p className="mt-2 text-[11px] text-muted-foreground">لا يوجد سجل بعد.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {data.map((row) => (
            <li key={row.id} className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{labelFor(row)}</span>
              {row.reason ? <span className="text-destructive"> — {row.reason}</span> : null}
              <span className="ms-1">
                ({new Date(row.created_at).toLocaleString("ar-EG")})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
