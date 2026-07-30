import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Eye,
  FileDown,
  Printer,
  MousePointerClick,
  Search,
  SquareMousePointer,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { downloadCsv, printReport, type ReportTable } from "@/lib/export-report";


type Stats = {
  days: number;
  views: number;
  prev_views: number;
  contact_clicks: number;
  prev_contact_clicks: number;
  card_clicks: number;
  prev_card_clicks: number;
  searches: number;
  prev_searches: number;
  zero_searches: number;
  daily: { day: string; views: number; contact_clicks: number; card_clicks: number }[];
  top_businesses: {
    id: string;
    name: string;
    username: string;
    views: number;
    card_clicks: number;
    contact_clicks: number;
  }[];
  top_terms: { term: string; searches: number; avg_results: number }[];
};

const RANGES = [7, 30, 90] as const;

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous && !current) return null;
  const diff = current - previous;
  const pct = previous ? Math.round((diff / previous) * 100) : 100;
  const up = diff >= 0;
  return (
    <span
      className={`text-[11px] font-semibold ${up ? "text-success" : "text-destructive"}`}
      dir="ltr"
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Kpi({
  icon,
  label,
  value,
  previous,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  previous: number;
}) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">
        {value.toLocaleString("ar-EG")}
      </p>
      <Delta current={value} previous={previous} />
    </div>
  );
}

/** Platform-wide insights: searches, page views and card/contact clicks. */
export function AdminInsights() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-directory-stats", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_directory_stats", {
        _days: days,
      });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const daily = data?.daily ?? [];
  const max = Math.max(
    1,
    ...daily.map((d) => Number(d.views) + Number(d.card_clicks)),
  );

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary-soft"
            }`}
          >
            آخر {d} يوم
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          جارٍ التحميل...
        </p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          تعذّر تحميل الإحصائيات.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Search className="size-3.5" />}
              label="عمليات البحث"
              value={Number(data?.searches ?? 0)}
              previous={Number(data?.prev_searches ?? 0)}
            />
            <Kpi
              icon={<SquareMousePointer className="size-3.5" />}
              label="نقرات كروت النتائج"
              value={Number(data?.card_clicks ?? 0)}
              previous={Number(data?.prev_card_clicks ?? 0)}
            />
            <Kpi
              icon={<Eye className="size-3.5" />}
              label="زيارات صفحات الأنشطة"
              value={Number(data?.views ?? 0)}
              previous={Number(data?.prev_views ?? 0)}
            />
            <Kpi
              icon={<MousePointerClick className="size-3.5" />}
              label="نقرات التواصل"
              value={Number(data?.contact_clicks ?? 0)}
              previous={Number(data?.prev_contact_clicks ?? 0)}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            {Number(data?.zero_searches ?? 0).toLocaleString("ar-EG")} عملية بحث لم
            تُرجع أي نتائج خلال هذه الفترة.
          </p>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <BarChart3 className="size-4" /> النشاط اليومي
            </h3>
            {!daily.length ? (
              <p className="mt-3 text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
            ) : (
              <ul className="mt-4 flex h-32 items-end gap-1" dir="ltr">
                {daily.map((d) => {
                  const total = Number(d.views) + Number(d.card_clicks);
                  return (
                    <li
                      key={d.day}
                      className="flex-1 rounded-t bg-primary/80"
                      style={{ height: `${Math.max(4, (total / max) * 100)}%` }}
                      title={`${d.day}: ${d.views} زيارة · ${d.card_clicks} نقرة كارت`}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/60 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-3 font-bold">أكثر الأنشطة تفاعلاً</th>
                    <th className="p-3 font-bold">زيارات</th>
                    <th className="p-3 font-bold">كروت</th>
                    <th className="p-3 font-bold">تواصل</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.top_businesses ?? []).map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="p-3 font-semibold">
                        <Link to="/$username" params={{ username: b.username }}>
                          {b.name}
                        </Link>
                      </td>
                      <td className="p-3">{Number(b.views).toLocaleString("ar-EG")}</td>
                      <td className="p-3">
                        {Number(b.card_clicks).toLocaleString("ar-EG")}
                      </td>
                      <td className="p-3">
                        {Number(b.contact_clicks).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {!(data?.top_businesses ?? []).length ? (
                    <tr>
                      <td className="p-4 text-muted-foreground" colSpan={4}>
                        لا توجد بيانات بعد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>

            <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/60 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-3 font-bold">أكثر كلمات البحث</th>
                    <th className="p-3 font-bold">مرات البحث</th>
                    <th className="p-3 font-bold">متوسط النتائج</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.top_terms ?? []).map((t) => (
                    <tr key={t.term} className="border-t border-border">
                      <td className="p-3 font-semibold" dir="auto">
                        {t.term}
                      </td>
                      <td className="p-3">
                        {Number(t.searches).toLocaleString("ar-EG")}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {Number(t.avg_results ?? 0).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {!(data?.top_terms ?? []).length ? (
                    <tr>
                      <td className="p-4 text-muted-foreground" colSpan={3}>
                        لا توجد بيانات بعد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
