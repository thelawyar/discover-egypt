import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { getCityPage } from "@/lib/directory.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogImageMeta } from "@/lib/og";
import { PageShell } from "@/components/SiteHeader";
import { BusinessCard } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";

function cityQuery(slug: string, page: number) {
  return queryOptions({
    queryKey: ["city", slug, page],
    queryFn: () => getCityPage({ data: { slug, page } }),
  });
}

const citySearchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/city/$slug")({
  validateSearch: zodValidator(citySearchSchema),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const [data, origin] = await Promise.all([
      context.queryClient.ensureQueryData(cityQuery(params.slug, deps.page)),
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
    ]);
    if (!data) throw notFound();
    return {
      origin,
      name: data.city.name,
      gov: data.city.governorate_name,
      govSlug: data.city.governorate_slug ?? null,
      total: data.total,
      page: data.page,
      pages: Math.max(1, Math.ceil(data.total / data.perPage)),
      image: data.items.find((i) => i.cover_image_url)?.cover_image_url ?? null,
      items: data.items
        .slice(0, 10)
        .map((i) => ({ id: i.id, name: i.name, username: i.username })),
    };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "المدينة غير موجودة | اكتشف مدينتك" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const origin = loaderData.origin ?? "";
    const pageSuffix = loaderData.page > 1 ? ` - صفحة ${loaderData.page}` : "";
    const title = `دليل ${loaderData.name} التجاري${pageSuffix} | اكتشف مدينتك`;
    const desc = `تصفح ${loaderData.total} نشاطاً تجارياً في ${loaderData.name}${loaderData.gov ? ` - ${loaderData.gov}` : ""}.`;
    const path = `/city/${params.slug}`;
    const pageUrl = `${origin}${path}${loaderData.page > 1 ? `?page=${loaderData.page}` : ""}`;

    const meta: Record<string, string>[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: pageUrl },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    meta.push(...ogImageMeta(loaderData.image, origin, `دليل ${loaderData.name}`));


    const links: Record<string, string>[] = [{ rel: "canonical", href: pageUrl }];
    if (loaderData.page > 1)
      links.push({
        rel: "prev",
        href: `${origin}${path}${loaderData.page - 1 > 1 ? `?page=${loaderData.page - 1}` : ""}`,
      });
    if (loaderData.page < loaderData.pages)
      links.push({ rel: "next", href: `${origin}${path}?page=${loaderData.page + 1}` });

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description: desc,
      url: pageUrl,
      about: { "@type": "City", name: loaderData.name, addressCountry: "EG" },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: loaderData.total,
        itemListElement: loaderData.items.map((b, i) => ({
          "@type": "ListItem",
          position: (loaderData.page - 1) * 24 + i + 1,
          name: b.name,
          url: `${origin}/${b.username}`,
        })),
      },
    };

    const trail: { name: string; item: string }[] = [
      { name: "الرئيسية", item: `${origin}/` },
    ];
    if (loaderData.gov && loaderData.govSlug)
      trail.push({
        name: loaderData.gov,
        item: `${origin}/search?gov=${encodeURIComponent(loaderData.govSlug)}`,
      });
    trail.push({ name: loaderData.name, item: `${origin}${path}` });

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    };

    return {
      meta,
      links,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
      ],
    };
  },
  headers: () => ({
    "X-Robots-Tag": "index, follow, max-image-preview:large, max-snippet:-1",
  }),

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
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(cityQuery(slug, page));
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.perPage));

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

        {pages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="ترقيم الصفحات">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={page <= 1}
              onClick={() => navigate({ search: { page: page - 1 } })}
            >
              السابق
            </Button>
            <span className="text-xs text-muted-foreground">
              صفحة {page} من {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={page >= pages}
              onClick={() => navigate({ search: { page: page + 1 } })}
            >
              التالي
            </Button>
          </nav>
        ) : null}
      </div>
    </PageShell>
  );
}
