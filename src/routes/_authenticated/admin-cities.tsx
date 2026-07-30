import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, Search, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin-cities")({
  head: () => ({
    meta: [
      { title: "إدارة المحافظات والمدن | اكتشف مدينتك" },
      {
        name: "description",
        content: "ربط المدن بالمحافظات وتفعيلها وتعديل أسمائها واستيراد وتصدير CSV.",
      },
      { property: "og:title", content: "إدارة المحافظات والمدن | اكتشف مدينتك" },
      {
        property: "og:description",
        content: "ربط المدن بالمحافظات وتفعيلها وتعديل أسمائها.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCitiesPage,
});

type CityRow = {
  id: string;
  name: string;
  slug: string;
  governorate_id: string;
  is_new_city: boolean;
  is_active: boolean;
};

type GovRow = { id: string; name: string; slug: string };

function slugify(v: string) {
  return v.trim().replace(/[()،,.]/g, "").replace(/\s+/g, "-");
}

function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
}

function AdminCitiesPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [gov, setGov] = useState("");
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-locations"],
    enabled: isAdmin,
    queryFn: async () => {
      const [g, c] = await Promise.all([
        supabase.from("governorates").select("id,name,slug").order("sort_order"),
        supabase
          .from("cities")
          .select("id,name,slug,governorate_id,is_new_city,is_active")
          .order("name"),
      ]);
      if (g.error) throw g.error;
      if (c.error) throw c.error;
      return {
        governorates: (g.data ?? []) as GovRow[],
        cities: (c.data ?? []) as CityRow[],
      };
    },
  });

  const update = useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      slug?: string;
      is_active?: boolean;
      governorate_id?: string;
    }) => {
      const { id, ...fields } = payload;
      const { error } = await supabase.from("cities").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
    },
    onError: () => toast.error("تعذّر التحديث"),
  });

  const filtered = useMemo(() => {
    let list = data?.cities ?? [];
    if (gov) list = list.filter((c) => c.governorate_id === gov);
    const value = term.trim();
    if (value) list = list.filter((c) => c.name.includes(value));
    return list;
  }, [data, gov, term]);

  function exportCsv() {
    const govName = new Map((data?.governorates ?? []).map((g) => [g.id, g.name]));
    const rows = [
      ["governorate", "city", "slug", "is_new_city", "is_active"],
      ...filtered.map((c) => [
        govName.get(c.governorate_id) ?? "",
        c.name,
        c.slug,
        String(c.is_new_city),
        String(c.is_active),
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cities.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    if (!data) return;
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("الملف فارغ");
      const header = rows[0].map((h) => h.toLowerCase());
      const body = header.includes("city") ? rows.slice(1) : rows;
      const idx = (key: string, fallback: number) => {
        const i = header.indexOf(key);
        return i === -1 ? fallback : i;
      };
      const gi = idx("governorate", 0);
      const ci = idx("city", 1);
      const si = idx("slug", 2);
      const ni = idx("is_new_city", 3);
      const ai = idx("is_active", 4);

      const govByName = new Map(data.governorates.map((g) => [g.name.trim(), g.id]));
      const cityKey = new Map(
        data.cities.map((c) => [`${c.governorate_id}|${c.name.trim()}`, c]),
      );

      const inserts: Record<string, unknown>[] = [];
      let updated = 0;
      let skipped = 0;

      for (const row of body) {
        const governorate = (row[gi] ?? "").trim();
        const name = (row[ci] ?? "").trim();
        const governorate_id = govByName.get(governorate);
        if (!governorate_id || name.length < 2) {
          skipped += 1;
          continue;
        }
        const slug = (row[si] ?? "").trim() || slugify(name);
        const is_new_city = /^(true|1|نعم)$/i.test((row[ni] ?? "").trim());
        const activeRaw = (row[ai] ?? "").trim();
        const is_active = activeRaw ? /^(true|1|نعم)$/i.test(activeRaw) : true;

        const existing = cityKey.get(`${governorate_id}|${name}`);
        if (existing) {
          const { error } = await supabase
            .from("cities")
            .update({ slug, is_new_city, is_active })
            .eq("id", existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          inserts.push({ governorate_id, name, slug, is_new_city, is_active });
        }
      }

      if (inserts.length) {
        const { error } = await supabase.from("cities").insert(inserts);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
      toast.success(
        `تم الاستيراد: ${inserts.length} مدينة جديدة، ${updated} تحديث، ${skipped} تم تخطيها`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر استيراد الملف");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading || isLoading) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-lg font-bold">هذه الصفحة للإدارة فقط</p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">المحافظات والمدن</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              فعّل أو عطّل المدن، عدّل الأسماء، واربطها بالمحافظة الصحيحة.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={exportCsv}>
              <Download className="size-4" /> تصدير CSV
            </Button>
            <Button
              className="rounded-full"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              استيراد CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importCsv(file);
              }}
            />
          </div>
        </div>

        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
          صيغة ملف CSV: governorate, city, slug, is_new_city, is_active — تُحدَّث المدينة
          الموجودة بنفس الاسم داخل نفس المحافظة، وتُضاف الجديدة.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <select
            value={gov}
            onChange={(e) => setGov(e.target.value)}
            className="h-9 rounded-full border border-border bg-card px-3 text-xs"
          >
            <option value="">كل المحافظات</option>
            {(data?.governorates ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث عن مدينة..."
              aria-label="ابحث عن مدينة"
              className="h-full w-40 bg-transparent text-xs outline-none"
            />
          </div>
          <span className="ms-auto text-xs text-muted-foreground">
            {filtered.length.toLocaleString("ar-EG")} مدينة
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((c) => {
            const govName =
              (data?.governorates ?? []).find((g) => g.id === c.governorate_id)?.name ??
              "—";
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <div className="min-w-40 flex-1">
                  {editing?.id === c.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editing.name}
                        maxLength={80}
                        onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                      />
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          const name = editing.name.trim();
                          if (name.length < 2) {
                            toast.error("اسم المدينة قصير جداً");
                            return;
                          }
                          update.mutate({ id: c.id, name, slug: slugify(name) });
                          setEditing(null);
                        }}
                      >
                        حفظ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => setEditing(null)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {govName} · {c.slug}
                        {c.is_new_city ? " · مدينة جديدة" : ""}
                      </p>
                    </>
                  )}
                </div>

                <select
                  value={c.governorate_id}
                  onChange={(e) =>
                    update.mutate({ id: c.id, governorate_id: e.target.value })
                  }
                  className="h-8 rounded-full border border-border bg-background px-2 text-xs"
                >
                  {(data?.governorates ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setEditing({ id: c.id, name: c.name })}
                >
                  تعديل الاسم
                </Button>
                <Button
                  size="sm"
                  variant={c.is_active ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => update.mutate({ id: c.id, is_active: !c.is_active })}
                >
                  {c.is_active ? "مفعّلة" : "معطّلة"}
                </Button>
              </div>
            );
          })}
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              لا توجد مدن مطابقة.
            </p>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
