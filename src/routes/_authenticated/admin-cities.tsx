import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/_authenticated/admin-cities")({
  head: () => ({
    meta: [
      { title: "إدارة المحافظات والمدن | اكتشف مدينتك" },
      {
        name: "description",
        content: "إضافة المحافظات والمدن مباشرة وتفعيلها وتعديل أسمائها واستيراد وتصدير CSV.",
      },
      { property: "og:title", content: "إدارة المحافظات والمدن | اكتشف مدينتك" },
      {
        property: "og:description",
        content: "إضافة وتعديل المحافظات والمدن من لوحة الإدارة.",
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

type GovRow = { id: string; name: string; slug: string; sort_order: number };

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
  const [tab, setTab] = useState<"cities" | "governorates">("cities");
  const [gov, setGov] = useState("");
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [editingGov, setEditingGov] = useState<{ id: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // direct add forms
  const [newCity, setNewCity] = useState({ gov: "", name: "", isNew: false });
  const [newGov, setNewGov] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-locations"],
    enabled: isAdmin,
    queryFn: async () => {
      const [g, c] = await Promise.all([
        supabase.from("governorates").select("id,name,slug,sort_order").order("sort_order"),
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

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
  }

  const update = useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      slug?: string;
      is_active?: boolean;
      is_new_city?: boolean;
      governorate_id?: string;
    }) => {
      const { id, ...fields } = payload;
      const { error } = await supabase.from("cities").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      refresh();
    },
    onError: () => toast.error("تعذّر التحديث"),
  });

  const addCity = useMutation({
    mutationFn: async () => {
      const name = newCity.name.trim();
      if (!newCity.gov) throw new Error("اختر المحافظة أولاً");
      if (name.length < 2) throw new Error("اسم المدينة قصير جداً");
      const exists = (data?.cities ?? []).some(
        (c) => c.governorate_id === newCity.gov && c.name.trim() === name,
      );
      if (exists) throw new Error("المدينة موجودة بالفعل في هذه المحافظة");
      const { error } = await supabase.from("cities").insert({
        governorate_id: newCity.gov,
        name,
        slug: slugify(name),
        is_new_city: newCity.isNew,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة المدينة");
      setNewCity((p) => ({ ...p, name: "" }));
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّرت الإضافة"),
  });

  const deleteCity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف المدينة");
      refresh();
    },
    onError: () =>
      toast.error("تعذّر الحذف — قد تكون هناك أنشطة مرتبطة بالمدينة. عطّلها بدل الحذف."),
  });

  const addGov = useMutation({
    mutationFn: async () => {
      const name = newGov.trim();
      if (name.length < 2) throw new Error("اسم المحافظة قصير جداً");
      if ((data?.governorates ?? []).some((g) => g.name.trim() === name))
        throw new Error("المحافظة موجودة بالفعل");
      const maxOrder = Math.max(0, ...(data?.governorates ?? []).map((g) => g.sort_order));
      const { error } = await supabase.from("governorates").insert({
        name,
        slug: slugify(name),
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة المحافظة");
      setNewGov("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّرت الإضافة"),
  });

  const updateGov = useMutation({
    mutationFn: async (payload: { id: string; name?: string; sort_order?: number }) => {
      const { id, ...fields } = payload;
      const patch = fields.name
        ? { ...fields, slug: slugify(fields.name) }
        : fields;
      const { error } = await supabase.from("governorates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      refresh();
    },
    onError: () => toast.error("تعذّر التحديث"),
  });

  const deleteGov = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("governorates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف المحافظة");
      refresh();
    },
    onError: () => toast.error("تعذّر الحذف — تأكد من عدم وجود مدن أو أنشطة مرتبطة."),
  });

  const filtered = useMemo(() => {
    let list = data?.cities ?? [];
    if (gov) list = list.filter((c) => c.governorate_id === gov);
    const value = term.trim();
    if (value) list = list.filter((c) => c.name.includes(value));
    return list;
  }, [data, gov, term]);

  const cityCountByGov = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data?.cities ?? [])
      map.set(c.governorate_id, (map.get(c.governorate_id) ?? 0) + 1);
    return map;
  }, [data]);

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

      const inserts: {
        governorate_id: string;
        name: string;
        slug: string;
        is_new_city: boolean;
        is_active: boolean;
      }[] = [];
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

      refresh();
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

  const governorates = data?.governorates ?? [];

  return (
    <PageShell>
      <div dir="rtl" className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <BackButton fallback="/admin" label="لوحة الإدارة" />
            <h1 className="mt-2 text-xl font-extrabold">المحافظات والمدن</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              أضف المحافظات والمدن مباشرة، عدّل الأسماء، فعّلها أو عطّلها.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={exportCsv}>
              <Download className="size-4" /> تصدير CSV
            </Button>
            <Button
              variant="outline"
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

        <div className="mt-5 inline-flex rounded-full border border-border bg-card p-1 text-xs">
          {(
            [
              ["cities", `المدن (${(data?.cities ?? []).length})`],
              ["governorates", `المحافظات (${governorates.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 font-bold transition ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "cities" ? (
          <>
            <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-bold">إضافة مدينة جديدة</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={newCity.gov}
                  onChange={(e) => setNewCity((p) => ({ ...p, gov: e.target.value }))}
                  aria-label="المحافظة"
                  className="h-9 rounded-full border border-border bg-background px-3 text-xs"
                >
                  <option value="">اختر المحافظة</option>
                  {governorates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Input
                  value={newCity.name}
                  maxLength={80}
                  placeholder="اسم المدينة"
                  aria-label="اسم المدينة"
                  className="h-9 w-52 rounded-full"
                  onChange={(e) => setNewCity((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCity.mutate();
                  }}
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newCity.isNew}
                    onChange={(e) =>
                      setNewCity((p) => ({ ...p, isNew: e.target.checked }))
                    }
                  />
                  مدينة جديدة
                </label>
                <Button
                  className="rounded-full"
                  disabled={addCity.isPending}
                  onClick={() => addCity.mutate()}
                >
                  {addCity.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  إضافة
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <select
                value={gov}
                onChange={(e) => setGov(e.target.value)}
                aria-label="تصفية بالمحافظة"
                className="h-9 rounded-full border border-border bg-card px-3 text-xs"
              >
                <option value="">كل المحافظات</option>
                {governorates.map((g) => (
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
                  governorates.find((g) => g.id === c.governorate_id)?.name ?? "—";
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
                            onChange={(e) =>
                              setEditing({ id: c.id, name: e.target.value })
                            }
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
                      aria-label="المحافظة"
                      onChange={(e) =>
                        update.mutate({ id: c.id, governorate_id: e.target.value })
                      }
                      className="h-8 rounded-full border border-border bg-background px-2 text-xs"
                    >
                      {governorates.map((g) => (
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
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="حذف المدينة"
                      className="rounded-full text-destructive"
                      onClick={() => {
                        if (confirm(`حذف مدينة «${c.name}» نهائياً؟`))
                          deleteCity.mutate(c.id);
                      }}
                    >
                      <Trash2 className="size-4" />
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

            <p className="mt-6 rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
              صيغة ملف CSV: governorate, city, slug, is_new_city, is_active — تُحدَّث المدينة
              الموجودة بنفس الاسم داخل نفس المحافظة، وتُضاف الجديدة.
            </p>
          </>
        ) : (
          <>
            <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-bold">إضافة محافظة جديدة</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  value={newGov}
                  maxLength={80}
                  placeholder="اسم المحافظة"
                  aria-label="اسم المحافظة"
                  className="h-9 w-52 rounded-full"
                  onChange={(e) => setNewGov(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addGov.mutate();
                  }}
                />
                <Button
                  className="rounded-full"
                  disabled={addGov.isPending}
                  onClick={() => addGov.mutate()}
                >
                  {addGov.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  إضافة
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {governorates.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
                >
                  <div className="min-w-40 flex-1">
                    {editingGov?.id === g.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingGov.name}
                          maxLength={80}
                          onChange={(e) =>
                            setEditingGov({ id: g.id, name: e.target.value })
                          }
                        />
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            const name = editingGov.name.trim();
                            if (name.length < 2) {
                              toast.error("اسم المحافظة قصير جداً");
                              return;
                            }
                            updateGov.mutate({ id: g.id, name });
                            setEditingGov(null);
                          }}
                        >
                          حفظ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => setEditingGov(null)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold">{g.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {g.slug} · {(cityCountByGov.get(g.id) ?? 0).toLocaleString("ar-EG")}{" "}
                          مدينة
                        </p>
                      </>
                    )}
                  </div>

                  <Input
                    type="number"
                    aria-label="الترتيب"
                    defaultValue={g.sort_order}
                    className="h-8 w-20 rounded-full text-center text-xs"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value) && value !== g.sort_order)
                        updateGov.mutate({ id: g.id, sort_order: value });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setEditingGov({ id: g.id, name: g.name })}
                  >
                    تعديل الاسم
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setGov(g.id);
                      setTab("cities");
                    }}
                  >
                    عرض المدن
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="حذف المحافظة"
                    className="rounded-full text-destructive"
                    onClick={() => {
                      if (confirm(`حذف محافظة «${g.name}» نهائياً؟`)) deleteGov.mutate(g.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
