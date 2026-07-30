import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Eye, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  views: number;
  contact_clicks: number;
  sources: { source: string; count: number }[];
  contacts: { label: string; count: number }[];
  daily: { day: string; count: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "زيارة مباشرة",
  internal: "من داخل الموقع",
  google: "جوجل",
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  whatsapp: "واتساب",
  twitter: "إكس (تويتر)",
};

const CONTACT_LABELS: Record<string, string> = {
  phone: "الاتصال",
  whatsapp: "واتساب",
  email: "البريد",
  website: "الموقع",
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  map: "الخريطة",
  other: "أخرى",
};

const RANGES = [
  { days: 7, label: "٧ أيام" },
  { days: 30, label: "٣٠ يوم" },
  { days: 90, label: "٩٠ يوم" },
];

function Bars({
  rows,
  labels,
}: {
  rows: { key: string; count: number }[];
  labels: Record<string, string>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length)
    return <p className="text-xs text-muted-foreground">لا توجد بيانات بعد.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{labels[r.key] ?? r.key}</span>
            <span className="font-bold">{r.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Visits, traffic sources and contact clicks for one business mini-site. */
export function BusinessStats({ businessId }: { businessId: string }) {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["business-stats", businessId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("business_page_stats", {
        _business_id: businessId,
        _days: days,
      });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BarChart3 className="size-4" /> إحصائيات صفحة النشاط
        </h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                days === r.days
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
      ) : error ? (
        <p className="text-xs text-muted-foreground">تعذّر تحميل الإحصائيات.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Eye className="size-3.5" /> زيارات الصفحة
              </p>
              <p className="mt-1 text-2xl font-extrabold">{data?.views ?? 0}</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MousePointerClick className="size-3.5" /> نقرات التواصل
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {data?.contact_clicks ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-bold">مصادر الزيارات</h3>
              <Bars
                rows={(data?.sources ?? []).map((s) => ({
                  key: s.source,
                  count: Number(s.count),
                }))}
                labels={SOURCE_LABELS}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold">النقرات على أزرار التواصل</h3>
              <Bars
                rows={(data?.contacts ?? []).map((c) => ({
                  key: c.label,
                  count: Number(c.count),
                }))}
                labels={CONTACT_LABELS}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
