import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type MyReview = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  rejection_reason: string | null;
};

/** Public review form: submissions wait for admin approval before showing. */
export function ReviewForm({ businessId }: { businessId: string }) {
  const { user, loading } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<MyReview | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setMine(null);
      return;
    }
    void supabase
      .from("reviews")
      .select("id,rating,comment,status,rejection_reason")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const row = (data as MyReview | null) ?? null;
        setMine(row);
        if (row) {
          setRating(row.rating);
          setComment(row.comment ?? "");
        }
      });
    return () => {
      active = false;
    };
  }, [businessId, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (rating < 1) {
      toast.error("اختر عدد النجوم أولاً");
      return;
    }
    setSending(true);
    const payload = {
      business_id: businessId,
      user_id: user.id,
      rating,
      comment: comment.trim().slice(0, 1000) || null,
      author_name:
        name.trim().slice(0, 60) ||
        (user.user_metadata?.["full_name"] as string | undefined)?.slice(0, 60) ||
        null,
    };
    const { error } = mine
      ? await supabase.from("reviews").update(payload).eq("id", mine.id)
      : await supabase.from("reviews").insert(payload);
    setSending(false);
    if (error) {
      toast.error("تعذّر إرسال التقييم، حاول مرة أخرى");
      return;
    }
    setMine({
      id: mine?.id ?? "new",
      rating,
      comment: payload.comment,
      status: "pending",
      rejection_reason: null,
    });
    toast.success("تم إرسال تقييمك وسيظهر بعد مراجعة الإدارة");
  }

  const cardStyle = {
    borderColor: "var(--biz-border)",
    background: "var(--biz-card)",
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={cardStyle}>
        <h2 className="mb-2 text-sm font-bold">قيّم هذا النشاط</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--biz-muted)" }}>
          سجّل الدخول لتتمكن من كتابة رأيك. تُنشر التقييمات بعد مراجعة الإدارة.
        </p>
        <Button asChild size="sm" className="rounded-full">
          <Link to="/auth">تسجيل الدخول</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-4" style={cardStyle}>
      <h2 className="mb-1 text-sm font-bold">
        {mine ? "تعديل تقييمك" : "قيّم هذا النشاط"}
      </h2>
      <p className="mb-3 text-xs" style={{ color: "var(--biz-muted)" }}>
        يُنشر التقييم بعد مراجعة الإدارة.
      </p>

      {mine?.status === "pending" ? (
        <p className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--biz-soft)" }}>
          تقييمك قيد المراجعة حالياً.
        </p>
      ) : null}
      {mine?.status === "rejected" ? (
        <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          تم رفض تقييمك{mine.rejection_reason ? ` — ${mine.rejection_reason}` : ""}. يمكنك تعديله وإعادة الإرسال.
        </p>
      ) : null}

      <div className="mb-3 flex flex-row-reverse justify-end gap-1">
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} نجوم`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              className={
                n <= (hover || rating)
                  ? "size-6 fill-warning text-warning"
                  : "size-6 opacity-30"
              }
            />
          </button>
        ))}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="الاسم المعروض (اختياري)"
        className="mb-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--biz-primary)]"
        style={{ borderColor: "var(--biz-border)", background: "var(--biz-card)" }}
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="اكتب رأيك في المكان..."
        className="mb-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--biz-primary)]"
        style={{ borderColor: "var(--biz-border)", background: "var(--biz-card)" }}
      />
      <Button type="submit" size="sm" disabled={sending} className="w-full rounded-full">
        <Send className="size-4" />
        {sending ? "جارٍ الإرسال..." : mine ? "إرسال التعديل للمراجعة" : "إرسال التقييم"}
      </Button>
    </form>
  );
}
