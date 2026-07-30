import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS } from "@/lib/directory-types";

/** Audit trail of moderation decisions for one business. */
export function ModerationLog({ businessId }: { businessId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["moderation-log", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_moderation_log")
        .select("id,from_status,to_status,reason,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading)
    return <p className="text-[11px] text-muted-foreground">جارٍ تحميل السجل...</p>;
  if (error)
    return <p className="text-[11px] text-muted-foreground">تعذّر تحميل السجل.</p>;
  if (!data?.length)
    return <p className="text-[11px] text-muted-foreground">لا توجد تعديلات مسجّلة.</p>;

  return (
    <ol className="space-y-2">
      {data.map((row) => (
        <li key={row.id} className="rounded-lg bg-muted/60 p-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">
              {row.from_status
                ? `${STATUS_LABELS[row.from_status] ?? row.from_status} ← ${
                    STATUS_LABELS[row.to_status] ?? row.to_status
                  }`
                : `إنشاء (${STATUS_LABELS[row.to_status] ?? row.to_status})`}
            </span>
            <span className="text-muted-foreground">
              {new Date(row.created_at).toLocaleString("ar-EG")}
            </span>
          </div>
          {row.reason ? (
            <p className="mt-1 text-muted-foreground">السبب: {row.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
