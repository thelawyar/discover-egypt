import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListPlus, Trash2, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { arNorm } from "@/lib/ar-normalize";

export const Route = createFileRoute("/_authenticated/dashboard/lists")({
  head: () => ({
    meta: [
      { title: "قوائمي | اكتشف مدينتك" },
      {
        name: "description",
        content: "أنشئ قوائم مثل «أفضل كافيهات في القاهرة» وشاركها مع الآخرين.",
      },
      { property: "og:title", content: "قوائمي | اكتشف مدينتك" },
      { property: "og:description", content: "إدارة قوائمك المختارة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLists,
});

function slugify(title: string) {
  const base = arNorm(title)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `${base || "list"}-${Math.random().toString(36).slice(2, 7)}`;
}

function DashboardLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeList, setActiveList] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  const { data: lists } = useQuery({
    queryKey: ["my-lists", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("*,list_items(id,business_id,note,businesses(name,username))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: matches } = useQuery({
    queryKey: ["list-business-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,username")
        .eq("status", "approved")
        .ilike("search_norm", `%${arNorm(term)}%`)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createList = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lists").insert({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        slug: slugify(title),
        is_public: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إنشاء القائمة");
      setTitle("");
      setDescription("");
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
    },
    onError: () => toast.error("تعذّر إنشاء القائمة"),
  });

  const addItem = useMutation({
    mutationFn: async ({ listId, businessId }: { listId: string; businessId: string }) => {
      const { error } = await supabase
        .from("list_items")
        .insert({ list_id: listId, business_id: businessId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت الإضافة للقائمة");
      setTerm("");
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
    },
    onError: () => toast.error("المكان موجود بالفعل أو تعذّرت الإضافة"),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("list_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-lists"] }),
    onError: () => toast.error("تعذّر الحذف"),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف القائمة");
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
    },
    onError: () => toast.error("تعذّر حذف القائمة"),
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">قوائمي</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              مثل «أفضل كافيهات في القاهرة» — أنشئ قائمة وشارك رابطها.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/lists">القوائم العامة</Link>
            </Button>
            <Button className="rounded-full" onClick={() => setCreating((v) => !v)}>
              <ListPlus className="size-4" /> قائمة جديدة
            </Button>
          </div>
        </div>

        {creating ? (
          <form
            className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 3) {
                toast.error("اكتب عنواناً للقائمة");
                return;
              }
              createList.mutate();
            }}
          >
            <div>
              <Label>عنوان القائمة *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أفضل كافيهات في القاهرة"
                className="mt-1"
              />
            </div>
            <div>
              <Label>وصف مختصر</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="rounded-full" disabled={createList.isPending}>
              {createList.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
            </Button>
          </form>
        ) : null}

        <div className="mt-6 space-y-4">
          {lists?.map((l) => (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{l.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(l.list_items?.length ?? 0).toLocaleString("ar-EG")} مكان
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/lists/${l.slug}`,
                      );
                      toast.success("تم نسخ رابط القائمة");
                    }}
                  >
                    <Share2 className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("حذف القائمة وكل عناصرها؟")) deleteList.mutate(l.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {l.list_items?.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                  >
                    <span className="truncate">{item.businesses?.name ?? "نشاط"}</span>
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() => removeItem.mutate(item.id)}
                    >
                      إزالة
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3">
                {activeList === l.id ? (
                  <div className="space-y-2">
                    <Input
                      autoFocus
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="ابحث باسم النشاط..."
                    />
                    {matches?.length ? (
                      <ul className="rounded-xl border border-border">
                        {matches.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-right text-sm hover:bg-muted"
                              onClick={() =>
                                addItem.mutate({ listId: l.id, businessId: m.id })
                              }
                            >
                              {m.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveList(null);
                        setTerm("");
                      }}
                    >
                      إغلاق
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setActiveList(l.id)}
                  >
                    <Plus className="size-4" /> إضافة مكان
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {lists && lists.length === 0 && !creating ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            لم تنشئ أي قائمة بعد.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
