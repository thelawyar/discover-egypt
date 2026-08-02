import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "closed", label: "النشاط مغلق نهائياً" },
  { value: "wrong_info", label: "بيانات غير صحيحة" },
  { value: "duplicate", label: "مكرر" },
  { value: "spam", label: "محتوى إعلاني مزعج" },
  { value: "offensive", label: "محتوى مخالف أو مسيء" },
  { value: "other", label: "سبب آخر" },
];

export const REPORT_REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
);

/** Lets any visitor report a problem with a business page for admin review. */
export function ReportBusinessButton({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_info");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (details.trim().length > 1000) {
      toast.error("التفاصيل طويلة جداً");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("business_reports").insert({
      business_id: businessId,
      reason,
      details: details.trim() || null,
      reporter_id: auth.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("تعذّر إرسال البلاغ");
      return;
    }
    toast.success("تم إرسال البلاغ", { description: "سيراجعه فريق الإدارة قريباً." });
    setDetails("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Flag className="size-3.5" /> إبلاغ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>الإبلاغ عن هذا النشاط</DialogTitle>
          <DialogDescription>
            اختر سبب البلاغ وأضف تفاصيل تساعد الإدارة على المراجعة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>سبب البلاغ</Label>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    reason === r.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-primary-soft"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="report-details">تفاصيل (اختياري)</Label>
            <Textarea
              id="report-details"
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب ما لاحظته..."
            />
          </div>

          <Button className="w-full rounded-full" disabled={saving} onClick={() => void submit()}>
            {saving ? "جارٍ الإرسال..." : "إرسال البلاغ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReportBusinessButton;
