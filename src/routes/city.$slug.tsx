import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCityPage } from "@/lib/directory.functions";
import { PageShell } from "@/components/SiteHeader";
import { BusinessCard } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";

function cityQuery(slug: string) {
  return queryOptions({
    queryKey: ["city", slug],
    queryFn: () => getCityPage({ data: { slug } }),
  });
}

export const Route = createFileRoute("/city/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(cityQuery(params.slug));
    if (!data) throw notFound();
    return { name: data.city.name, gov: data.city.governorate_name, total: data.total };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "المدينة غير موجودة | اكتشف مدينتك" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `دليل ${loaderData.name} التجاري | اكتشف مدينتك`;
    const desc = `تصفح ${loaderData.total} نشاطاً تجارياً في ${loaderData.name}${loaderData.gov ? ` - ${loaderData.gov}` : ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: CityPage,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <p className="text-lg font-bold">المدينة غير موجودة</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </PageShell>
  ),
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل بيانات المدينة.
      </div>
    </PageShell>
  ),
});

function CityPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(cityQuery(slug));
  if (!data) return null;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">دليل {data.city.name} التجاري</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.city.governorate_name ? `${data.city.governorate_name} · ` : ""}
          {data.total.toLocaleString("ar-EG")} نشاط معتمد
        </p>

        {data.items.length === 0 ? (
          <p className="py-24 text-center text-muted-foreground">
            لا توجد أنشطة مسجّلة في هذه المدينة بعد.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((b) => (
              <BusinessCard key={b.id} item={b} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
