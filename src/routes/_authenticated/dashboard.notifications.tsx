import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { StatusAlertSettings } from "@/components/dashboard/StatusAlertSettings";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "إعدادات التنبيهات | اكتشف مدينتك" },
      {
        name: "description",
        content:
          "اختر قناة التنبيه (إشعار داخلي أو بريد إلكتروني) لكل حالة من حالات نشاطك: القبول، الرفض، أو السحب.",
      },
      { property: "og:title", content: "إعدادات التنبيهات | اكتشف مدينتك" },
      {
        property: "og:description",
        content: "تحكّم في تنبيهات نشاطك التجاري داخل اكتشف مدينتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsSettingsPage,
});

function NotificationsSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">إعدادات التنبيهات</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            اختر كيف تحب أن نبلغك بكل ما يخص أنشطتك التجارية.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/dashboard">
            <ArrowRight className="size-4" /> رجوع
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <StatusAlertSettings />
        <NotificationSettings />
      </div>
    </main>
  );
}
