import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Traffic = {
  visits: number;
  prev_visits: number;
  visitors: number;
  prev_visitors: number;
  today: number;
  total: number;
  top_pages: { path: string; visits: number }[];
  sources: { source: string; visits: number }[];
  click_types: { label: string; clicks: number }[];
};

const CLICK_LABELS: Record<string, string> = {
  phone: "اتصال هاتفي",
  whatsapp: "واتساب",
  whatsapp_floating: "زر واتساب العائم",
  email: "بريد إلكتروني",
  website: "الموقع الإلكتروني",
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  map: "الخريطة",
};

const n = (v: unknown) => Number(v ?? 0).toLocaleString("ar-EG");

/** Site-wide visit counter and per-type contact click tracking. */
export function AdminTraffic({ days }: { days: number }) {
  const { data } = useQuery({
    queryKey: ["admin-traffic", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_traffic_stats", { _days: days });
      if (error) throw error;
      return data as unknown as Traffic;
    },
  });
  if (!data) return null;
  const tiles = [
    ["زيارات اليوم", data.today],
    [`زيارات آخر ${days} يوم`, data.visits],
    ["زوار فريدون", data.visitors],
    ["إجمالي الزيارات", data.total],
  ] as const;
  const maxClicks = Math.max(1, ...data.click_types.map((c) => Number(c.clicks)));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, v]) => (
          <div key={label} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{n(v)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-bold">النقرات على الأنشطة حسب النوع</h3>
          {!data.click_types.length ? (
            <p className="text-xs text-muted-foreground">لا توجد نقرات بعد.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {data.click_types.map((c) => (
                <li key={c.label}>
                  <div className="flex justify-between">
                    <span>{CLICK_LABELS[c.label] ?? c.label}</span>
                    <span className="font-bold">{n(c.clicks)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-muted">
                    <div className="h-full rounded bg-primary" style={{ width: `${(Number(c.clicks) / maxClicks) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-bold">أكثر الصفحات زيارة</h3>
          <ul className="space-y-1.5 text-xs">
            {data.top_pages.map((p) => (
              <li key={p.path} className="flex justify-between gap-2">
                <span dir="ltr" className="truncate">{decodeURIComponent(p.path)}</span>
                <span className="font-bold">{n(p.visits)}</span>
              </li>
            ))}
            {!data.top_pages.length ? <li className="text-muted-foreground">لا توجد بيانات بعد.</li> : null}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-bold">مصادر الزيارات</h3>
          <ul className="space-y-1.5 text-xs">
            {data.sources.map((s) => (
              <li key={s.source} className="flex justify-between">
                <span>{s.source === "direct" ? "مباشر" : s.source === "internal" ? "تنقل داخل الموقع" : s.source}</span>
                <span className="font-bold">{n(s.visits)}</span>
              </li>
            ))}
            {!data.sources.length ? <li className="text-muted-foreground">لا توجد بيانات بعد.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
