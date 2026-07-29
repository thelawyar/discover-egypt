import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { getSeoStatus } from "@/lib/seo-status.functions";
import { Button } from "@/components/ui/button";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SeoStatusPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["seo-status"],
    queryFn: () => getSeoStatus(),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !data) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold">حالة السيو</h2>
          <p className="text-xs text-muted-foreground">
            آخر تحديث لبيانات خريطة الموقع: {formatDate(data.lastBusinessUpdate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> sitemap.xml
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href="/robots.txt" target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> robots.txt
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="روابط داخل خريطة الموقع" value={data.sitemapUrls} />
        <Stat label="أنشطة معتمدة (مفهرسة)" value={data.approvedBusinesses} />
        <Stat label="أنشطة مضافة آخر 7 أيام" value={data.newLast7Days} />
        <Stat label="أنشطة قيد المراجعة (غير مفهرسة)" value={data.pendingBusinesses} />
        <Stat label="صفحات المدن" value={data.cities} />
        <Stat label="صفحات التصنيفات" value={data.categories} />
        <Stat label="بدون صورة غلاف" value={data.missingImage} />
        <Stat label="وصف ناقص" value={data.missingDescription} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-extrabold">فحص البيانات المنظمة JSON-LD</h3>
        <ul className="mt-3 space-y-2 text-xs">
          {[
            ["حقل description في LocalBusiness", data.missingDescription],
            ["حقل image في LocalBusiness", data.missingImage],
            ["حقل address / addressLocality", data.missingLocation],
            ["حقل telephone", data.missingContact],
          ].map(([label, count]) => (
            <li key={label as string} className="flex items-center gap-2">
              {count ? (
                <AlertTriangle className="size-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-600" />
              )}
              <span>{label}</span>
              <span className="text-muted-foreground">
                {count ? `— ${count} نشاطاً بحاجة لاستكمال` : "— مكتمل"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {data.issues.length ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-extrabold">
            أنشطة بحاجة لتحسين ({data.issues.length})
          </h3>
          <div className="mt-3 space-y-3">
            {data.issues.map((issue) => (
              <div key={issue.id} className="rounded-xl bg-muted/50 p-3">
                <Link
                  to="/business/$id"
                  params={{ id: issue.id }}
                  className="text-xs font-bold hover:text-primary"
                >
                  {issue.name}
                </Link>
                <ul className="mt-1 list-inside list-disc text-[11px] text-muted-foreground">
                  {issue.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-emerald-600">لا توجد مشاكل في البيانات المنظمة 🎉</p>
      )}
    </div>
  );
}
