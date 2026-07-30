import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Stat = {
  term: string;
  searches: number;
  avg_results: number | null;
  last_results: number | null;
  zero_rate: number | null;
  last_searched: string;
};

const RANGES = [7, 30, 90] as const;

/** Admin panel: most searched words, their result counts and empty-result alerts. */
export function AdminSearchTerms() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["search-term-stats", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_term_stats", {
        _days: days,
        _limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as Stat[];
    },
  });

  const rows = data ?? [];
  const empty = rows.filter((r) => (r.last_results ?? 0) === 0);
  const totalSearches = rows.reduce((s, r) => s + Number(r.searches), 0);

  return (
    <div className="mt-5 space-y-4">
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
        <span className="ms-auto text-xs text-muted-foreground">
          {totalSearches.toLocaleString("ar-EG")} عملية بحث ·{" "}
          {rows.length.toLocaleString("ar-EG")} كلمة
        </span>
      </div>

      {empty.length ? (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="size-4" />
            {empty.length.toLocaleString("ar-EG")} كلمة بحث بدون أي نتائج
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            فرصة لإضافة أنشطة أو تصنيفات تغطي هذه الكلمات.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {empty.slice(0, 20).map((r) => (
              <span
                key={r.term}
                className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium"
                dir="auto"
              >
                {r.term} · {Number(r.searches).toLocaleString("ar-EG")}×
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          جارٍ التحميل...
        </p>
      ) : !rows.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          لا توجد عمليات بحث مسجلة في هذه الفترة بعد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/60 text-[11px] text-muted-foreground">
              <tr>
                <th className="p-3 font-bold">الكلمة</th>
                <th className="p-3 font-bold">عدد مرات البحث</th>
                <th className="p-3 font-bold">آخر عدد نتائج</th>
                <th className="p-3 font-bold">متوسط النتائج</th>
                <th className="p-3 font-bold">نسبة بحث بلا نتائج</th>
                <th className="p-3 font-bold">آخر بحث</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const zero = (r.last_results ?? 0) === 0;
                return (
                  <tr key={r.term} className="border-t border-border">
                    <td className="p-3 font-semibold" dir="auto">
                      <span className="flex items-center gap-1.5">
                        {zero ? (
                          <AlertTriangle className="size-3.5 text-destructive" />
                        ) : (
                          <TrendingUp className="size-3.5 text-muted-foreground" />
                        )}
                        {r.term}
                      </span>
                    </td>
                    <td className="p-3">
                      {Number(r.searches).toLocaleString("ar-EG")}
                    </td>
                    <td className={`p-3 ${zero ? "font-bold text-destructive" : ""}`}>
                      {Number(r.last_results ?? 0).toLocaleString("ar-EG")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {Number(r.avg_results ?? 0).toLocaleString("ar-EG")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {Number(r.zero_rate ?? 0).toLocaleString("ar-EG")}%
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(r.last_searched).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link
                          to="/search"
                          search={{ q: r.term, city: "", gov: "", cat: "", page: 1 }}
                        >
                          <Search className="size-3.5" /> تجربة
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
