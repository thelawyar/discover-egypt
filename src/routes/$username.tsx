import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getBusiness, resolveLegacyHandle } from "@/lib/directory.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { absoluteOgImage, ogImageMeta } from "@/lib/og";
import { BusinessProfile } from "@/components/BusinessProfile";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

function businessQuery(handle: string) {
  return queryOptions({
    queryKey: ["business", handle],
    queryFn: () => getBusiness({ data: { id: handle } }),
  });
}

export const Route = createFileRoute("/$username")({
  loader: async ({ context, params }) => {
    const [data, origin] = await Promise.all([
      context.queryClient.ensureQueryData(businessQuery(params.username)),
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
    ]);
    if (!data) {
      // Old handle? keep the link alive with a permanent redirect.
      const current = await resolveLegacyHandle({
        data: { username: params.username },
      });
      if (current && current !== params.username) {
        throw redirect({
          to: "/$username",
          params: { username: current },
          statusCode: 301,
        });
      }
      throw notFound();
    }
    const rating = data.reviews.length
      ? data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length
      : null;
    return {
      origin,
      username: data.username,
      name: data.name,
      description: data.description,
      image: data.cover_image_url ?? data.images[0]?.url ?? data.logo_url ?? null,
      address: data.address,
      phone: data.phone,
      website: data.website,
      city_name: data.city_name,
      city_slug: data.city_slug,
      governorate_name: data.governorate_name,
      category_name: data.category_name,
      latitude: data.latitude,
      longitude: data.longitude,
      rating,
      updated_at: data.updated_at,
      reviewCount: data.reviews.length,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "الصفحة غير متاحة | اكتشف مدينتك" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.name} | اكتشف مدينتك`;
    const desc =
      loaderData.description?.slice(0, 150) ??
      `تفاصيل ${loaderData.name} في الدليل التجاري اكتشف مدينتك.`;
    const origin = loaderData.origin ?? "";
    const url = `/${loaderData.username}`;
    const meta: Record<string, string>[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${origin}${url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (loaderData.updated_at) {
      // Helps crawlers refresh the preview after a theme/content update.
      meta.push({ property: "og:updated_time", content: loaderData.updated_at });
    }
    const image = absoluteOgImage(loaderData.image, origin);
    meta.push(...ogImageMeta(loaderData.image, origin, loaderData.name));

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: loaderData.name,
      description: desc,
      url: `${origin}${url}`,
      ...(image ? { image } : {}),
      ...(loaderData.phone ? { telephone: loaderData.phone } : {}),
      ...(loaderData.website ? { sameAs: [loaderData.website] } : {}),
      address: {
        "@type": "PostalAddress",
        addressCountry: "EG",
        ...(loaderData.address ? { streetAddress: loaderData.address } : {}),
        ...(loaderData.city_name ? { addressLocality: loaderData.city_name } : {}),
        ...(loaderData.governorate_name
          ? { addressRegion: loaderData.governorate_name }
          : {}),
      },
      ...(loaderData.latitude && loaderData.longitude
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: loaderData.latitude,
              longitude: loaderData.longitude,
            },
          }
        : {}),
      ...(loaderData.rating && loaderData.reviewCount
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: loaderData.rating.toFixed(1),
              reviewCount: loaderData.reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    };

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${origin}/` },
        ...(loaderData.city_slug && loaderData.city_name
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: loaderData.city_name,
                item: `${origin}/city/${loaderData.city_slug}`,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: loaderData.city_slug ? 3 : 2,
          name: loaderData.name,
          item: `${origin}${url}`,
        },
      ],
    };

    return {
      meta,
      links: [{ rel: "canonical", href: `${origin}${url}` }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
      ],
    };
  },
  component: BusinessHandlePage,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <p className="text-lg font-bold">
          هذه الصفحة غير موجودة أو لم تتم الموافقة على النشاط بعد
        </p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </PageShell>
  ),
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل بيانات النشاط.
      </div>
    </PageShell>
  ),
});

function BusinessHandlePage() {
  const { username } = Route.useParams();
  const { data } = useSuspenseQuery(businessQuery(username));
  if (!data) return null;
  return (
    <PageShell>
      <BusinessProfile data={data} />
    </PageShell>
  );
}
