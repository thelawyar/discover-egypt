import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NotificationPrefs = {
  push_enabled: boolean;
  notify_messages: boolean;
  notify_contact_clicks: boolean;
  sound_enabled: boolean;
  notify_approved_inapp: boolean;
  notify_rejected_inapp: boolean;
  notify_withdrawn_inapp: boolean;
  notify_approved_email: boolean;
  notify_rejected_email: boolean;
  notify_withdrawn_email: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  push_enabled: false,
  notify_messages: true,
  notify_contact_clicks: true,
  sound_enabled: true,
  notify_approved_inapp: true,
  notify_rejected_inapp: true,
  notify_withdrawn_inapp: true,
  notify_approved_email: true,
  notify_rejected_email: true,
  notify_withdrawn_email: false,
};

const PREF_COLUMNS =
  "push_enabled,notify_messages,notify_contact_clicks,sound_enabled,notify_approved_inapp,notify_rejected_inapp,notify_withdrawn_inapp,notify_approved_email,notify_rejected_email,notify_withdrawn_email";

/** The current user's notification preferences (created on first save). */
export function useNotificationPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select(PREF_COLUMNS)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_PREFS;
    },
  });
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* audio unavailable */
  }
}

/** Show a system (push-style) notification when the browser allows it. */
export function showSystemNotification(title: string, body: string, url?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/app-icon-192.png",
      badge: "/app-icon-192.png",
      dir: "rtl",
      lang: "ar",
      tag: "durtown-message",
    });
    n.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      n.close();
    };
  } catch {
    /* notification blocked */
  }
}

/**
 * Live listener for new messages/orders arriving on the user's business pages.
 * Fires a toast plus a system notification when the user enabled them.
 */
export function useBusinessNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: prefs } = useNotificationPrefs();
  const prefsRef = useRef<NotificationPrefs>(DEFAULT_PREFS);
  prefsRef.current = prefs ?? DEFAULT_PREFS;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("business-messages-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "business_messages" },
        (payload) => {
          const row = payload.new as {
            sender_name?: string;
            body?: string;
            kind?: string;
          };
          queryClient.invalidateQueries({ queryKey: ["business-messages"] });
          if (!prefsRef.current.notify_messages) return;
          const title =
            row.kind === "order" ? "طلب جديد على نشاطك" : "رسالة جديدة على نشاطك";
          const body = `${row.sender_name ?? "زائر"}: ${(row.body ?? "").slice(0, 90)}`;
          toast.info(title, { description: body });
          if (prefsRef.current.sound_enabled) beep();
          if (prefsRef.current.push_enabled) {
            showSystemNotification(title, body, "/dashboard");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
