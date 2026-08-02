import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Sparkles, Clock3, Baby, Tag, CalendarDays, Dices, Map as MapIcon } from "lucide-react";

const LazyCityMap = lazy(() =>
  import("@/components/CityMap").then((m) => ({ default: m.CityMap })),
);
import { getCityPage } from "@/lib/directory.functions";
import { AMENITIES } from "@/lib/business-attributes";

import { getCityPortal } from "@/lib/portal.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogCardMeta } from "@/lib/og";
import { PageShell } from "@/components/SiteHeader";
import { BusinessCard } from "@/components/BusinessCard";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";

function cityQuery(slug: string, page: number) {
  return queryOptions({
    queryKey: ["city", slug, page],
    queryFn: () => getCityPage({ data: { slug, page } }),
  });
}

function portalQuery(slug: string) {
  return queryOptions({
    queryKey: ["city-portal", slug],
    queryFn: () => getCityPortal({ data: { slug } }),
    staleTime: 1000 * 60 * 5,
  });
}

const citySearchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
});


export const Route = createFileRoute("/city/$slug")({
  validateSearch: zodValidator(citySearchSchema),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    if (deps.page === 1) {
      await context.queryClient.ensureQueryData(portalQuery(params.slug));
    }

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
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "اكتشف مدينتك" },
      { property: "og:locale", content: "ar_EG" },
      { property: "og:url", content: pageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    meta.push(
      ...ogCardMeta(
        {
          kind: "city",
          title: `دليل ${loaderData.name} التجاري`,
          subtitle: loaderData.gov ? `محافظة ${loaderData.gov}` : null,
          badge: "مدينة",
          stats: [
            `${loaderData.total.toLocaleString("ar-EG")} نشاط`,
            loaderData.page > 1 ? `صفحة ${loaderData.page}` : null,
          ],
          photo: loaderData.image,
        },
        origin,
        `دليل ${loaderData.name}`,
      ),
    );


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

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const TIME_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "offers", label: "لديه عرض حالي" },
  { value: "events", label: "لديه حدث قادم" },
] as const;

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function CityPortalSections({ slug, cityName }: { slug: string; cityName: string }) {
  const { data: portal } = useSuspenseQuery(portalQuery(slug));
  const [mounted, setMounted] = useState(false);
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState(0);
  const [amenity, setAmenity] = useState("");
  const [when, setWhen] = useState<(typeof TIME_FILTERS)[number]["value"]>("all");
  useEffect(() => setMounted(true), []);
  if (!portal) return null;

  const nearby = portal.nearby ?? [];
  const offerIds = new Set((portal.offers ?? []).map((e) => e.business_id));
  const eventIds = new Set((portal.events ?? []).map((e) => e.business_id));

  const catOptions = Array.from(
    new Set(nearby.map((b) => b.category_name).filter(Boolean) as string[]),
  ).slice(0, 12);
  const amenityOptions = AMENITIES.filter((a) =>
    nearby.some((b) => (b.amenities ?? []).includes(a.value)),
  ).slice(0, 10);

  const filtered = nearby.filter((b) => {
    if (cat && b.category_name !== cat) return false;
    if (price && (b.price_level ?? 0) !== price) return false;
    if (amenity && !(b.amenities ?? []).includes(amenity)) return false;
    if (when === "offers" && !offerIds.has(b.id)) return false;
    if (when === "events" && !eventIds.has(b.id)) return false;
    return true;
  });

  const mapPoints = filtered
    .filter((b) => b.latitude !== null && b.longitude !== null)
    .map((b) => ({
      id: b.id,
      name: b.name,
      username: b.username,
      latitude: b.latitude as number,
      longitude: b.longitude as number,
    }));

  const hasMapData = nearby.some((b) => b.latitude !== null && b.longitude !== null);
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      {portal.categories.length ? (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {portal.categories.map((c) => (
            <Link
              key={c.slug}
              to="/search"
              search={{ q: "", city: slug, gov: "", cat: c.slug, page: 1 }}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {c.name}
              <span className="mr-1 text-muted-foreground">
                {c.count.toLocaleString("ar-EG")}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {hasMapData ? (
        <Section title="خريطة الأماكن القريبة" icon={<MapIcon className="size-5 text-primary" />}>
          <div className="mb-3 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={!cat} onClick={() => setCat("")}>
                كل التصنيفات
              </FilterChip>
              {catOptions.map((c) => (
                <FilterChip key={c} active={cat === c} onClick={() => setCat(cat === c ? "" : c)}>
                  {c}
                </FilterChip>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={!price} onClick={() => setPrice(0)}>
                كل الأسعار
              </FilterChip>
              {[1, 2, 3, 4].map((p) => (
                <FilterChip key={p} active={price === p} onClick={() => setPrice(price === p ? 0 : p)}>
                  {"$".repeat(p)}
                </FilterChip>
              ))}
              {TIME_FILTERS.map((t) => (
                <FilterChip key={t.value} active={when === t.value} onClick={() => setWhen(t.value)}>
                  {t.label}
                </FilterChip>
              ))}
            </div>
            {amenityOptions.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <FilterChip active={!amenity} onClick={() => setAmenity("")}>
                  كل الخدمات
                </FilterChip>
                {amenityOptions.map((a) => (
                  <FilterChip
                    key={a.value}
                    active={amenity === a.value}
                    onClick={() => setAmenity(amenity === a.value ? "" : a.value)}
                  >
                    {a.label}
                  </FilterChip>
                ))}
              </div>
            ) : null}
          </div>

          {mapPoints.length === 0 ? (
            <p className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              لا توجد أماكن مطابقة للفلاتر المختارة على الخريطة.
            </p>
          ) : mounted ? (
            <Suspense
              fallback={<div className="h-[340px] w-full animate-pulse rounded-2xl bg-muted" />}
            >
              <LazyCityMap
                key={mapPoints.map((p) => p.id).join(",")}
                points={mapPoints}
                cityName={cityName}
              />
            </Suspense>
          ) : (
            <div className="h-[340px] w-full rounded-2xl bg-muted" />
          )}
        </Section>
      ) : null}


      {portal.offers.length ? (
        <Section title="عروض اليوم" icon={<Tag className="size-5 text-primary" />}>
          <div className={grid}>
            {portal.offers.map((e) => (
              <EventCard key={e.id} item={e} />
            ))}
          </div>
        </Section>
      ) : null}

      {portal.top.length ? (
        <Section title="أفضل الأماكن" icon={<Sparkles className="size-5 text-primary" />}>
          <div className={grid}>
            {portal.top.map((b) => (
              <BusinessCard key={b.id} item={b} />
            ))}
          </div>
        </Section>
      ) : null}

      {portal.events.length ? (
        <Section
          title="أحداث ومناسبات قادمة"
          icon={<CalendarDays className="size-5 text-primary" />}
        >
          <div className={grid}>
            {portal.events.map((e) => (
              <EventCard key={e.id} item={e} />
            ))}
          </div>
        </Section>
      ) : null}

      {portal.kids.length ? (
        <Section title="أماكن مناسبة للأطفال" icon={<Baby className="size-5 text-primary" />}>
          <div className={grid}>
            {portal.kids.map((b) => (
              <BusinessCard key={b.id} item={b} />
            ))}
          </div>
        </Section>
      ) : null}

      {portal.latest.length ? (
        <Section title="أحدث الأنشطة" icon={<Clock3 className="size-5 text-primary" />}>
          <div className={grid}>
            {portal.latest.map((b) => (
              <BusinessCard key={b.id} item={b} />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">دليل {data.city.name} التجاري</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.city.governorate_name ? `${data.city.governorate_name} · ` : ""}
              {data.total.toLocaleString("ar-EG")} نشاط معتمد
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link
              to="/discover"
              search={{ city: slug, gov: "", good: "", vibe: "", price: 0, seed: 1 }}
            >
              <Dices className="size-4" /> اكتشف عشوائياً
            </Link>
          </Button>
        </div>

        {page === 1 ? (
          <CityPortalSections slug={slug} cityName={data.city.name} />
        ) : null}

        {page === 1 && data.items.length ? (
          <h2 className="mt-10 text-lg font-bold">كل الأنشطة في {data.city.name}</h2>
        ) : null}


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
