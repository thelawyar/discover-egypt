import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { BellRing, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/** In-app notifications for approval / rejection / withdrawal of the user's businesses. */
export function StatusNotifications() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["status-notifications"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = (data ?? []).filter((n) => !n.is_read).map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["status-notifications"] }),
  });

  const unread = (data ?? []).filter((n) => !n.is_read).length;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BellRing className="size-4" /> إشعارات حالة الأنشطة
          {unread ? (
            <span className="rounded-full bg-primary px-2 text-[11px] text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </h2>
        {unread ? (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="size-4" /> تعليم الكل كمقروء
          </Button>
        ) : null}
      </div>

      {!data?.length ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          لا توجد إشعارات بعد — سنخبرك فور قبول أو رفض أو سحب أي نشاط.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-3 text-xs ${
                n.is_read ? "border-border" : "border-primary/40 bg-primary/5"
              }`}
            >
              <p className="font-semibold">{n.title}</p>
              {n.body ? <p className="mt-1 text-muted-foreground">{n.body}</p> : null}
              <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
