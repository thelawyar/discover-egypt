import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SearchX } from "lucide-react";
import { getTaxonomy, searchBusinesses } from "@/lib/directory.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { SearchBar } from "@/components/SearchBar";
import { BusinessCard } from "@/components/BusinessCard";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  gov: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

type SearchParams = z.infer<typeof searchSchema>;

const taxonomyQuery = queryOptions({
  queryKey: ["taxonomy"],
  queryFn: () => getTaxonomy(),
  staleTime: 1000 * 60 * 30,
});

function resultsQuery(deps: {
  q: string;
  city: string;
  gov: string;
  cat: string;
  page: number;
}) {
  return queryOptions({
    queryKey: ["search", deps],
    queryFn: () =>
      searchBusinesses({
        data: {
          q: deps.q || undefined,
          city: deps.city || undefined,
          gov: deps.gov || undefined,
          cat: deps.cat || undefined,
          page: deps.page,
        },
      }),
  });
}

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  head: ({ match, loaderData }) => {
    const ld = loaderData as unknown as { origin: string; pages: number } | undefined;
    const sp = match.search ?? { q: "", city: "", gov: "", cat: "", page: 1 };
    const term = sp.q?.trim();
    const title = term
      ? `نتائج البحث عن "${term}" | اكتشف مدينتك`
      : (sp.page ?? 1) > 1
        ? `تصفح الأنشطة التجارية - صفحة ${sp.page} | اكتشف مدينتك`
        : "تصفح الأنشطة التجارية | اكتشف مدينتك";
    const desc = term
      ? `نتائج البحث عن "${term}" في الدليل التجاري لكل المدن المصرية.`
      : "ابحث عن الأنشطة التجارية في المدن المصرية وتصفح النتائج بالتفصيل.";
    const origin = ld?.origin ?? "";
    const build = (page: number) => {
      const usp = new URLSearchParams();
      if (sp.city) usp.set("city", sp.city);
      if (sp.gov) usp.set("gov", sp.gov);
      if (sp.cat) usp.set("cat", sp.cat);
      if (page > 1) usp.set("page", String(page));
      const qs = usp.toString();
      return `${origin}/search${qs ? `?${qs}` : ""}`;
    };

    const page = sp.page ?? 1;
    const canonical = build(page);
    // Free-text queries stay out of the index; filtered/browsable pages are indexable.
    const indexable = !term;

    const links: Record<string, string>[] = [{ rel: "canonical", href: canonical }];
    if (indexable) {
      if (page > 1) links.push({ rel: "prev", href: build(page - 1) });
      if (ld && page < ld.pages) links.push({ rel: "next", href: build(page + 1) });
    }

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: canonical },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "robots", content: indexable ? "index, follow" : "noindex, follow" },
      ],
      links,
    };
  },
  loader: async ({ context, deps }) => {
    const [, results, origin] = await Promise.all([
      context.queryClient.ensureQueryData(taxonomyQuery),
      context.queryClient.ensureQueryData(resultsQuery(deps)),
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
    ]);
    return { origin, pages: Math.max(1, Math.ceil(results.total / 12)) };
  },
  component: SearchPage,
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">
        تعذّر تحميل نتائج البحث. حاول مرة أخرى.
      </div>
    </PageShell>
  ),
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: taxonomy } = useSuspenseQuery(taxonomyQuery);
  const { data: results } = useSuspenseQuery(resultsQuery(params));

  const perPage = 12;
  const pages = Math.max(1, Math.ceil(results.total / perPage));
  const selectedGov = taxonomy.governorates.find((g) => g.slug === params.gov);
  const govCities = selectedGov
    ? taxonomy.cities.filter((c) => c.governorate_id === selectedGov.id)
    : taxonomy.cities;

  return (
    <PageShell>
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <SearchBar
            cities={taxonomy.cities}
            initialQuery={params.q}
            initialCity={params.city}
            size="compact"
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <select
            value={params.gov}
            onChange={(e) =>
              navigate({
                search: (p: SearchParams) => ({ ...p, gov: e.target.value, city: "", page: 1 }),
              })
            }
            className="h-9 rounded-full border border-border bg-card px-3 text-xs"
          >
            <option value="">كل المحافظات</option>
            {taxonomy.governorates.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={params.city}
            onChange={(e) =>
              navigate({ search: (p: SearchParams) => ({ ...p, city: e.target.value, page: 1 }) })
            }
            className="h-9 rounded-full border border-border bg-card px-3 text-xs"
          >
            <option value="">كل المدن</option>
            {govCities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={params.cat}
            onChange={(e) =>
              navigate({ search: (p: SearchParams) => ({ ...p, cat: e.target.value, page: 1 }) })
            }
            className="h-9 rounded-full border border-border bg-card px-3 text-xs"
          >
            <option value="">كل التصنيفات</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <span className="ms-auto text-xs text-muted-foreground">
            {results.total.toLocaleString("ar-EG")} نتيجة
          </span>
        </div>

        {results.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <SearchX className="size-10 text-muted-foreground" />
            <p className="font-semibold">لا توجد نتائج مطابقة</p>
            <p className="text-sm text-muted-foreground">
              جرّب كلمات بحث مختلفة أو وسّع نطاق المدينة والتصنيف.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2 rounded-full">
              <Link to="/">العودة للرئيسية</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((b) => (
              <BusinessCard key={b.id} item={b} />
            ))}
          </div>
        )}

        {pages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={params.page <= 1}
              onClick={() =>
                navigate({ search: (p: SearchParams) => ({ ...p, page: p.page - 1 }) })
              }
            >
              السابق
            </Button>
            <span className="text-xs text-muted-foreground">
              صفحة {params.page} من {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={params.page >= pages}
              onClick={() =>
                navigate({ search: (p: SearchParams) => ({ ...p, page: p.page + 1 }) })
              }
            >
              التالي
            </Button>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
