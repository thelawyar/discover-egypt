import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Inbox,
  MailOpen,
  Phone,
  Trash2,
  ShoppingBag,
  MessageSquare,
  Mail,
  Reply,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageThread } from "@/components/dashboard/MessageThread";

type MessageRow = {
  id: string;
  business_id: string;
  sender_name: string;
  sender_phone: string | null;
  sender_email: string | null;
  sender_id: string | null;
  kind: string;
  body: string;
  is_read: boolean;
  created_at: string;
  last_reply_at: string | null;
  businesses: { name: string; username: string } | null;
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/** Inbox of messages and orders received from the owner's business pages. */
export function MessagesInbox() {
  const queryClient = useQueryClient();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["business-messages"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_messages")
        .select(
          "id,business_id,sender_name,sender_phone,kind,body,is_read,created_at,businesses(name,username)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as MessageRow[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("business_messages")
        .update({ is_read: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business-messages"] }),
    onError: () => toast.error("تعذّر التحديث"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الرسالة");
      queryClient.invalidateQueries({ queryKey: ["business-messages"] });
    },
    onError: () => toast.error("تعذّر الحذف"),
  });

  const all = data ?? [];
  const unread = all.filter((m) => !m.is_read);
  const list = onlyUnread ? unread : all;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <Inbox className="size-4 shrink-0" /> الرسائل والطلبات
          {unread.length ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {unread.length} جديد
            </span>
          ) : null}
        </h2>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setOnlyUnread((v) => !v)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              onlyUnread ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            غير المقروء
          </button>
          {unread.length ? (
            <button
              type="button"
              onClick={() => markRead.mutate(unread.map((m) => m.id))}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              <MailOpen className="size-3" /> تحديد الكل كمقروء
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">جارٍ التحميل...</p>
      ) : !list.length ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          لا توجد رسائل حتى الآن.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border border-border p-3 text-xs ${
                m.is_read ? "bg-background" : "bg-primary-soft"
              }`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-bold">
                    {m.kind === "order" ? (
                      <ShoppingBag className="size-3.5" />
                    ) : (
                      <MessageSquare className="size-3.5" />
                    )}
                    {m.sender_name}
                    {m.businesses?.username ? (
                      <Link
                        to="/$username"
                        params={{ username: m.businesses.username }}
                        className="text-primary hover:underline"
                      >
                        — {m.businesses.name}
                      </Link>
                    ) : null}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">
                    {m.body}
                  </p>
                  {m.sender_phone ? (
                    <a
                      href={`tel:${m.sender_phone}`}
                      dir="ltr"
                      className="mt-1 inline-flex items-center gap-1 font-semibold text-primary"
                    >
                      <Phone className="size-3" /> {m.sender_phone}
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(m.created_at)}
                  </span>
                  <div className="flex gap-1">
                    {!m.is_read ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-full"
                        title="تحديد كمقروء"
                        onClick={() => markRead.mutate([m.id])}
                      >
                        <MailOpen className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-full text-destructive"
                      title="حذف"
                      onClick={() => remove.mutate(m.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
