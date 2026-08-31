import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Reply = {
  id: string;
  body: string;
  from_business: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/** Conversation view for one business message: replies plus a reply box. */
export function MessageThread({
  messageId,
  fromBusiness,
  onSent,
}: {
  messageId: string;
  /** true when the current user replies as the business team. */
  fromBusiness: boolean;
  onSent?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["message-replies", messageId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_message_replies")
        .select("id,body,from_business,created_at")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("business_message_replies").insert({
        message_id: messageId,
        sender_id: user!.id,
        from_business: fromBusiness,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      toast.success("تم إرسال الرد");
      queryClient.invalidateQueries({ queryKey: ["message-replies", messageId] });
      queryClient.invalidateQueries({ queryKey: ["business-messages"] });
      queryClient.invalidateQueries({ queryKey: ["my-sent-messages"] });
      onSent?.();
    },
    onError: () => toast.error("تعذّر إرسال الرد"),
  });

  const replies = data ?? [];

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">جارٍ تحميل المحادثة...</p>
      ) : null}
      {replies.map((r) => (
        <div
          key={r.id}
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
            r.from_business
              ? "ms-auto bg-primary text-primary-foreground"
              : "me-auto bg-muted"
          }`}
        >
          <p className="whitespace-pre-line break-words">{r.body}</p>
          <span className="mt-1 block text-[10px] opacity-70">
            {r.from_business ? "النشاط" : "المراسل"} · {timeAgo(r.created_at)}
          </span>
        </div>
      ))}

      <form
        className="flex items-end gap-2 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (text.length < 2) {
            toast.error("اكتب رداً أولاً");
            return;
          }
          send.mutate(text.slice(0, 2000));
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="اكتب ردك..."
          className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          disabled={send.isPending}
          title="إرسال"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
