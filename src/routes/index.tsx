import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getTaxonomy, getHomeStats } from "@/lib/directory.functions";
import { SearchBar } from "@/components/SearchBar";
import { BusinessCard } from "@/components/BusinessCard";
import { Brand, SiteHeader } from "@/components/SiteHeader";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogImageMeta } from "@/lib/og";

const taxonomyQuery = queryOptions({
  queryKey: ["taxonomy"],
  queryFn: () => getTaxonomy(),
  staleTime: 1000 * 60 * 30,
});

const statsQuery = queryOptions({
  queryKey: ["home-stats"],
  queryFn: () => getHomeStats(),
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => ({
    origin: await context.queryClient.ensureQueryData({
      queryKey: ["origin"],
      queryFn: () => getRequestOrigin(),
      staleTime: Infinity,
    }),
  }),
  head: ({ loaderData }) => ({
    meta: [
      { title: "اكتشف مدينتك | الدليل التجاري لكل مدن مصر" },
      {
        name: "description",
        content:
          "ابحث عن العيادات والمحلات والمصانع والمدارس والأكشاك في مدينتك. دليل تجاري شامل لكل المحافظات والمدن المصرية.",
      },
      { property: "og:title", content: "اكتشف مدينتك | الدليل التجاري لكل مدن مصر" },
      {
        property: "og:description",
        content: "دليل تجاري شامل يجمع كل الأنشطة التجارية في مدينتك.",
      },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "اكتشف مدينتك | الدليل التجاري لكل مدن مصر" },
      {
        name: "twitter:description",
        content: "دليل تجاري شامل يجمع كل الأنشطة التجارية في مدينتك.",
      },
      ...ogImageMeta(null, loaderData?.origin, "اكتشف مدينتك"),
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "اكتشف مدينتك",
          inLanguage: "ar-EG",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "/search?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(taxonomyQuery),
      context.queryClient.ensureQueryData(statsQuery),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: taxonomy } = useSuspenseQuery(taxonomyQuery);
  const { data: stats } = useSuspenseQuery(statsQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-end px-4">
        <SiteHeader />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-10 sm:pt-20">
        <h1 className="text-center">
          <Brand size="lg" />
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          الدليل التجاري الشامل لكل المدن المصرية
        </p>

        <div className="mt-8 flex w-full justify-center">
          <SearchBar cities={taxonomy.cities} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {taxonomy.categories.slice(0, 10).map((c) => (
            <Link
              key={c.id}
              to="/search"
              search={{ q: "", city: "", gov: "", cat: c.slug, page: 1 }}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          {stats.businessCount.toLocaleString("ar-EG")} نشاط ·{" "}
          {stats.cityCount.toLocaleString("ar-EG")} مدينة · 27 محافظة
        </p>

        {stats.featured.length ? (
          <section className="mx-auto mt-16 w-full max-w-6xl">
            <h2 className="mb-4 text-lg font-bold">أنشطة مميزة</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.featured.map((b) => (
                <BusinessCard key={b.id} item={b} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto mt-16 w-full max-w-6xl">
          <h2 className="mb-4 text-lg font-bold">تصفح حسب المحافظة</h2>
          <div className="flex flex-wrap gap-2">
            {taxonomy.governorates.map((g) => (
              <Link
                key={g.id}
                to="/search"
                search={{ q: "", city: "", gov: g.id, cat: "", page: 1 }}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary-soft hover:text-accent-foreground"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
        اكتشف مدينتك — durtown.com
      </footer>
    </div>
  );
}
