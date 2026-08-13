import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getTaxonomy, getHomeStats } from "@/lib/directory.functions";
import { SearchBar } from "@/components/SearchBar";
import { Brand, SiteHeader } from "@/components/SiteHeader";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogCardMeta } from "@/lib/og";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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
  loader: async ({ context }) => {
    const [origin] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
      context.queryClient.ensureQueryData(taxonomyQuery),
      context.queryClient.ensureQueryData(statsQuery),
    ]);
    return { origin };
  },

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
      ...ogCardMeta(
        {
          kind: "site",
          title: "اكتشف مدينتك",
          subtitle: "الدليل التجاري لكل مدن مصر",
          badge: "دليل تجاري",
        },
        loaderData?.origin,
        "اكتشف مدينتك",
      ),
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


  component: Home,
});

function Home() {
  const { data: taxonomy } = useSuspenseQuery(taxonomyQuery);
  const { data: stats } = useSuspenseQuery(statsQuery);
  const { hero_title: heroTitle, hero_subtitle: heroSubtitle } = useSiteSettings();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-end px-4 sm:h-16">
        <SiteHeader />
      </header>

      {/* Google-like home: brand + search only. Results live on /search */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <h1 className="text-center">
          <Brand size="lg" />
          <span className="sr-only">اكتشف مدينتك — الدليل التجاري لكل مدن مصر</span>
        </h1>
        {heroTitle ? (
          <p className="mt-2 text-center text-lg font-extrabold tracking-tight text-primary sm:text-2xl">
            {heroTitle}
          </p>
        ) : null}
        {heroSubtitle ? (
          <p className="mt-1 text-center text-xs text-muted-foreground sm:text-sm">
            {heroSubtitle}
          </p>
        ) : null}

        <div className="mt-6 flex w-full justify-center sm:mt-8">
          <SearchBar cities={taxonomy.cities} governorates={taxonomy.governorates} />
        </div>

        <Link
          to="/search"
          search={{ q: "", city: "", gov: "", cat: "", page: 1 }}
          className="mt-5 text-xs font-semibold text-primary hover:underline"
        >
          تصفح كل الأنشطة
        </Link>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {stats.businessCount.toLocaleString("ar-EG")} نشاط ·{" "}
          {stats.cityCount.toLocaleString("ar-EG")} مدينة · 27 محافظة
        </p>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        اكتشف مدينتك — durtown.com
      </footer>
    </div>
  );
}


