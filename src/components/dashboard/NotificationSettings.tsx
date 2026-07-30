import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PREFS,
  useNotificationPrefs,
  showSystemNotification,
  type NotificationPrefs,
} from "@/hooks/useBusinessNotifications";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const ROWS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  {
    key: "notify_messages",
    label: "الرسائل والطلبات الجديدة",
    hint: "تنبيه فوري عند وصول رسالة أو طلب من صفحة نشاطك.",
  },
  {
    key: "notify_contact_clicks",
    label: "نقرات زر التواصل",
    hint: "تنبيه عند ضغط زائر على الاتصال أو واتساب.",
  },
  {
    key: "sound_enabled",
    label: "صوت التنبيه",
    hint: "تشغيل نغمة قصيرة مع كل إشعار داخل اللوحة.",
  },
];

/** Notification preferences for the signed-in owner/manager. */
export function NotificationSettings() {
  const { user } = useAuth();
  const { data } = useNotificationPrefs();
  const queryClient = useQueryClient();
  const prefs = data ?? DEFAULT_PREFS;
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  const save = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const { error } = await supabase
        .from("notification_settings")
        .upsert({ user_id: user!.id, ...prefs, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: () => toast.error("تعذّر حفظ الإعدادات"),
  });

  async function enablePush() {
    if (!("Notification" in window)) {
      toast.error("متصفحك لا يدعم إشعارات النظام");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      save.mutate({ push_enabled: true });
      showSystemNotification("تم تفعيل الإشعارات", "هنبلغك فوراً بأي رسالة أو طلب جديد");
      toast.success("تم تفعيل إشعارات النظام");
    } else {
      toast.error("تم رفض الإذن — فعّله من إعدادات المتصفح");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Bell className="size-4" /> إعدادات الإشعارات
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          تحكّم في التنبيهات التي تصلك عن نشاطك.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold">
            <BellRing className="size-4" /> إشعارات المتصفح (Push)
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {permission === "unsupported"
              ? "غير مدعومة في هذا المتصفح."
              : permission === "granted"
                ? "مفعّلة — تظهر الإشعارات على جهازك أثناء فتح التطبيق."
                : "تحتاج إذن من المتصفح لعرض الإشعارات على جهازك."}
          </p>
        </div>
        {permission === "granted" ? (
          <Switch
            checked={prefs.push_enabled}
            onCheckedChange={(v) => save.mutate({ push_enabled: v })}
          />
        ) : (
          <Button
            size="sm"
            className="rounded-full"
            disabled={permission === "unsupported"}
            onClick={enablePush}
          >
            تفعيل
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-bold">
                {row.key === "sound_enabled" ? <Volume2 className="size-3.5" /> : null}
                {row.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{row.hint}</p>
            </div>
            <Switch
              checked={prefs[row.key]}
              onCheckedChange={(v) => save.mutate({ [row.key]: v })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
