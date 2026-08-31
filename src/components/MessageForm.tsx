import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

/** Public contact / order form shown on the business mini-site. */
export function MessageForm({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const [kind, setKind] = useState<"message" | "order">("message");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || body.trim().length < 2) {
      toast.error("من فضلك اكتب اسمك ونص الرسالة");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("لا يوجد اتصال بالإنترنت — حاول بعد عودة الشبكة");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("business_messages").insert({
      business_id: businessId,
      sender_name: name.trim().slice(0, 100),
      sender_phone: phone.trim() || null,
      kind,
      body: body.trim().slice(0, 2000),
    });
    setSending(false);
    if (error) {
      toast.error("تعذّر إرسال الرسالة، حاول مرة أخرى");
      return;
    }
    setSent(true);
    setName("");
    setPhone("");
    setBody("");
    toast.success("تم إرسال رسالتك بنجاح");
  }

  const inputCls =
    "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--biz-primary)]";
  const inputStyle = {
    borderColor: "var(--biz-border)",
    background: "var(--biz-card)",
    color: "inherit",
  };

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--biz-border)", background: "var(--biz-card)" }}
    >
      <h2 className="mb-1 text-sm font-bold">راسل {businessName}</h2>
      <p className="mb-3 text-xs" style={{ color: "var(--biz-muted)" }}>
        اطلب منتج أو اسأل عن خدمة، وسيصلك الرد على رقمك.
      </p>

      {sent ? (
        <div className="rounded-xl px-3 py-4 text-center text-xs" style={{ background: "var(--biz-soft)" }}>
          تم استلام رسالتك ✅
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-2 block w-full font-bold underline"
          >
            إرسال رسالة أخرى
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex gap-2">
            {(
              [
                ["message", "استفسار"],
                ["order", "طلب"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setKind(v)}
                className="flex-1 rounded-full px-3 py-1.5 text-xs font-bold"
                style={
                  kind === v
                    ? { background: "var(--biz-primary)", color: "#fff" }
                    : { background: "var(--biz-soft)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className={inputCls}
            style={inputStyle}
            placeholder="اسمك"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <input
            className={inputCls}
            style={inputStyle}
            placeholder="رقم الهاتف (اختياري)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            maxLength={30}
          />
          <textarea
            className={`${inputCls} min-h-24`}
            style={inputStyle}
            placeholder={kind === "order" ? "تفاصيل الطلب..." : "رسالتك..."}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
          />
          <Button type="submit" disabled={sending} className="w-full rounded-full">
            <Send className="size-4" /> {sending ? "جارٍ الإرسال..." : "إرسال"}
          </Button>
        </form>
      )}
    </div>
  );
}
