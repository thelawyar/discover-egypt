import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_LABELS } from "@/lib/directory-types";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const TABS = ["pending", "approved", "rejected"] as const;

export function AdminCategories() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const list = useQuery({
    queryKey: ["admin-categories", tab],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,icon,status,created_at")
        .eq("status", tab)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const value = name.trim().slice(0, 60);
      if (value.length < 2) throw new Error("اسم التصنيف قصير جداً");
      const { error } = await supabase
        .from("categories")
        .insert({ name: value, slug: "", status: "approved" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة التصنيف");
      setName("");
      setTab("approved");
      refresh();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّرت الإضافة"),
  });

  const setStatus = useMutation({
    mutationFn: async (p: { id: string; status: CategoryRow["status"] }) => {
      const { error } = await supabase
        .from("categories")
        .update({ status: p.status })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      refresh();
    },
    onError: () => toast.error("تعذّر التحديث"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      refresh();
    },
    onError: () => toast.error("تعذّر الحذف — قد يكون التصنيف مستخدماً"),
  });

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-bold">إضافة تصنيف جديد</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          التصنيفات التي يضيفها المسؤول تُنشر مباشرة، أما اقتراحات المستخدمين فتظهر
          في «قيد المراجعة».
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={name}
            maxLength={60}
            placeholder="مثال: مراكز تدريب"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create.mutate();
              }
            }}
          />
          <Button
            className="rounded-full"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="size-3.5" /> إضافة
          </Button>
        </div>
      </section>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary-soft"
            }`}
          >
            {STATUS_LABELS[t]}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          جارٍ التحميل...
        </p>
      ) : !list.data?.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          لا توجد تصنيفات في هذه القائمة.
        </p>
      ) : (
        <div className="space-y-2">
          {list.data.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-bold">{c.name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {c.slug}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.status !== "approved" ? (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStatus.mutate({ id: c.id, status: "approved" })}
                  >
                    <Check className="size-3.5" /> اعتماد
                  </Button>
                ) : null}
                {c.status !== "rejected" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-destructive"
                    onClick={() => setStatus.mutate({ id: c.id, status: "rejected" })}
                  >
                    <X className="size-3.5" /> رفض
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    if (confirm(`حذف التصنيف «${c.name}» نهائياً؟`)) remove.mutate(c.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
