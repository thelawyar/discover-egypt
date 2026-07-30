import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ContactEvent = {
  id: string;
  business_id: string;
  business_name: string | null;
  username: string | null;
  label: string | null;
  source: string | null;
  created_at: string;
};

const CONTACT_LABELS: Record<string, string> = {
  phone: "ضغط على زر الاتصال",
  whatsapp: "ضغط على واتساب",
  email: "ضغط على البريد",
  website: "فتح الموقع",
  facebook: "فتح فيسبوك",
  instagram: "فتح إنستجرام",
  map: "فتح الخريطة",
  other: "تفاعل مع صفحتك",
};

const SEEN_KEY = "durtown:contacts-seen-at";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/** In-dashboard notifications for new contact-button clicks on the owner's pages. */
export function ContactNotifications() {
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY));
  }, []);

  const { data } = useQuery({
    queryKey: ["contact-notifications"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase.rpc("business_recent_contacts", {
        _since: since,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ContactEvent[];
    },
  });

  const events = data ?? [];
  const unread = seenAt
    ? events.filter((e) => e.created_at > seenAt).length
    : events.length;

  function markRead() {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }

  if (!events.length) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Bell className="size-4" /> إشعارات التواصل
          {unread ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {unread} جديد
            </span>
          ) : null}
        </h2>
        {unread ? (
          <button
            type="button"
            onClick={markRead}
            className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground"
          >
            <Check className="size-3" /> تحديد كمقروء
          </button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {events.slice(0, 8).map((e) => {
          const isNew = !seenAt || e.created_at > seenAt;
          return (
            <li
              key={e.id}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs ${
                isNew ? "bg-primary-soft" : "bg-muted"
              }`}
            >
              <span>
                <span className="font-semibold">
                  {CONTACT_LABELS[e.label ?? "other"] ?? CONTACT_LABELS.other}
                </span>
                {e.username ? (
                  <>
                    {" — "}
                    <Link
                      to="/$username"
                      params={{ username: e.username }}
                      className="text-primary hover:underline"
                    >
                      {e.business_name}
                    </Link>
                  </>
                ) : null}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {timeAgo(e.created_at)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
