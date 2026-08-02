import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { arNorm } from "@/lib/ar-normalize";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function slugify(title: string) {
  const base = arNorm(title)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `${base || "list"}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Adds the business to one or more of the signed-in user's lists. */
export function AddToListButton({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: lists, isLoading } = useQuery({
    queryKey: ["add-to-list", user?.id, businessId],
    enabled: open && Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("id,title,is_public,list_items(id,business_id)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        is_public: l.is_public,
        itemId:
          (l.list_items ?? []).find((i) => i.business_id === businessId)?.id ?? null,
      }));
    },
  });

  const toggle = useMutation({
    mutationFn: async (list: { id: string; itemId: string | null }) => {
      if (list.itemId) {
        const { error } = await supabase.from("list_items").delete().eq("id", list.itemId);
        if (error) throw error;
        return "removed" as const;
      }
      const { error } = await supabase
        .from("list_items")
        .insert({ list_id: list.id, business_id: businessId });
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (result) => {
      toast.success(result === "added" ? "تمت الإضافة للقائمة" : "تمت الإزالة من القائمة");
      void queryClient.invalidateQueries({ queryKey: ["add-to-list"] });
      void queryClient.invalidateQueries({ queryKey: ["my-lists"] });
    },
    onError: () => toast.error("تعذّر تحديث القائمة"),
  });

  const createAndAdd = useMutation({
    mutationFn: async () => {
      const title = newTitle.trim();
      const { data, error } = await supabase
        .from("lists")
        .insert({
          user_id: user!.id,
          title,
          slug: slugify(title),
          is_public: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemError } = await supabase
        .from("list_items")
        .insert({ list_id: data.id, business_id: businessId });
      if (itemError) throw itemError;
    },
    onSuccess: () => {
      toast.success("تم إنشاء القائمة وإضافة النشاط");
      setNewTitle("");
      void queryClient.invalidateQueries({ queryKey: ["add-to-list"] });
      void queryClient.invalidateQueries({ queryKey: ["my-lists"] });
    },
    onError: () => toast.error("تعذّر إنشاء القائمة"),
  });

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => toast.info("سجّل الدخول أولاً لحفظ النشاط في قوائمك")}
      >
        <BookmarkPlus className="size-3.5" /> أضف لقائمة
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <BookmarkPlus className="size-3.5" /> أضف لقائمة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة «{businessName}» إلى قوائمك</DialogTitle>
          <DialogDescription>
            اختر قائمة أو أكثر، أو أنشئ قائمة جديدة ومشاركتها مع الآخرين.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : lists?.length ? (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {lists.map((l) => (
              <label
                key={l.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={Boolean(l.itemId)}
                  disabled={toggle.isPending}
                  onChange={() => toggle.mutate({ id: l.id, itemId: l.itemId })}
                />
                <span className="flex-1 truncate font-medium">{l.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {l.is_public ? "عامة" : "خاصة"}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد قوائم بعد، أنشئ أول قائمة.</p>
        )}

        <div className="flex gap-2 border-t border-border pt-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="اسم قائمة جديدة"
          />
          <Button
            className="shrink-0 rounded-full"
            disabled={newTitle.trim().length < 2 || createAndAdd.isPending}
            onClick={() => createAndAdd.mutate()}
          >
            <Plus className="size-4" /> إنشاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
