import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessagesSquare, ShoppingBag, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageThread } from "@/components/dashboard/MessageThread";
import { Button } from "@/components/ui/button";

type SentMessage = {
  id: string;
  kind: string;
  body: string;
  created_at: string;
  last_reply_at: string | null;
  unread_for_sender: boolean;
  businesses: { name: string; username: string } | null;
};

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  head: () => ({
    meta: [
      { title: "رسائلي | اكتشف مدينتك" },
      {
        name: "description",
        content: "تابع الرسائل والطلبات التي أرسلتها للأنشطة التجارية وردودهم عليها.",
      },
      { property: "og:title", content: "رسائلي | اكتشف مدينتك" },
      {
        property: "og:description",
        content: "محادثاتك مع الأنشطة التجارية داخل دليل اكتشف مدينتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyMessagesPage,
});

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

function MyMessagesPage() {
  const { user } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-sent-messages", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_messages")
        .select(
          "id,kind,body,created_at,last_reply_at,unread_for_sender,businesses(name,username)",
        )
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as SentMessage[];
    },
  });

  const list = data ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <MessagesSquare className="size-5" /> رسائلي
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            الرسائل والطلبات التي أرسلتها للأنشطة، وردودهم عليها.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/dashboard">
            <ArrowRight className="size-4" /> رجوع
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">جارٍ التحميل...</p>
        ) : !list.length ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            لم ترسل أي رسالة بعد.
          </p>
        ) : (
          list.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border border-border p-3 text-xs ${
                m.unread_for_sender ? "bg-primary-soft" : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="flex flex-wrap items-center gap-1.5 font-bold">
                  {m.kind === "order" ? (
                    <ShoppingBag className="size-3.5" />
                  ) : (
                    <MessageSquare className="size-3.5" />
                  )}
                  {m.businesses?.username ? (
                    <Link
                      to="/$username"
                      params={{ username: m.businesses.username }}
                      className="text-primary hover:underline"
                    >
                      {m.businesses.name}
                    </Link>
                  ) : (
                    "نشاط"
                  )}
                  {m.unread_for_sender ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      رد جديد
                    </span>
                  ) : null}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {timeAgo(m.last_reply_at ?? m.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">
                {m.body}
              </p>
              <button
                type="button"
                onClick={async () => {
                  setOpenId((v) => (v === m.id ? null : m.id));
                  if (m.unread_for_sender) {
                    await supabase
                      .from("business_messages")
                      .update({ unread_for_sender: false })
                      .eq("id", m.id);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold"
              >
                {openId === m.id ? "إغلاق المحادثة" : "فتح والرد"}
              </button>
              {openId === m.id ? (
                <MessageThread messageId={m.id} fromBusiness={false} />
              ) : null}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
