import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellDot, Mail, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PREFS,
  useNotificationPrefs,
  type NotificationPrefs,
} from "@/hooks/useBusinessNotifications";
import { Switch } from "@/components/ui/switch";

type Row = {
  label: string;
  hint: string;
  inapp: keyof NotificationPrefs;
  email: keyof NotificationPrefs;
};

const ROWS: Row[] = [
  {
    label: "قبول النشاط",
    hint: "عند اعتماد نشاطك وظهوره في الدليل.",
    inapp: "notify_approved_inapp",
    email: "notify_approved_email",
  },
  {
    label: "رفض النشاط",
    hint: "عند رفض النشاط مع سبب الرفض من الإدارة.",
    inapp: "notify_rejected_inapp",
    email: "notify_rejected_email",
  },
  {
    label: "سحب النشاط",
    hint: "عند سحب النشاط من الدليل بواسطتك أو بواسطة أحد المديرين.",
    inapp: "notify_withdrawn_inapp",
    email: "notify_withdrawn_email",
  },
];

/** Per-event channel preferences (in-app / email) for business status changes. */
export function StatusAlertSettings({ emailReady = false }: { emailReady?: boolean }) {
  const { user } = useAuth();
  const { data } = useNotificationPrefs();
  const queryClient = useQueryClient();
  const prefs = data ?? DEFAULT_PREFS;

  const save = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const { error } = await supabase
        .from("notification_settings")
        .upsert({ user_id: user!.id, ...prefs, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast.success("تم حفظ التفضيل");
    },
    onError: () => toast.error("تعذّر حفظ الإعدادات"),
  });

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BellDot className="size-4" /> تنبيهات حالة النشاط
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          اختر قناة التنبيه لكل حالة: إشعار داخلي في لوحة التحكم، أو رسالة بريد
          إلكتروني.
        </p>
      </div>

      {!emailReady ? (
        <p className="rounded-xl bg-muted px-4 py-3 text-[11px] text-muted-foreground">
          تنبيهات البريد ستبدأ في العمل فور تفعيل دومين البريد الخاص بالموقع —
          يمكنك ضبط تفضيلاتك من الآن.
        </p>
      ) : null}

      <ul className="space-y-2">
        {ROWS.map((row) => (
          <li key={row.label} className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-bold">{row.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{row.hint}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-semibold">
                  <MonitorSmartphone className="size-3.5" /> إشعار داخلي
                </span>
                <Switch
                  checked={prefs[row.inapp]}
                  onCheckedChange={(v) => save.mutate({ [row.inapp]: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-semibold">
                  <Mail className="size-3.5" /> بريد إلكتروني
                </span>
                <Switch
                  checked={prefs[row.email]}
                  onCheckedChange={(v) => save.mutate({ [row.email]: v })}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
