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
      gallery: [
        data.cover_image_url,
        data.logo_url,
        ...data.images.map((i) => i.url),
      ].filter((u): u is string => Boolean(u)),
      whatsapp: data.whatsapp ?? null,
      address: data.address,
      phone: data.phone,
      website: data.website,
      city_name: data.city_name,
      city_slug: data.city_slug,
      governorate_name: data.governorate_name,
      governorate_slug: data.governorate_slug,
      category_name: data.category_name,
      latitude: data.latitude,
      longitude: data.longitude,
      hours: data.hours ?? [],
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

    // Every gallery/cover image, absolute — richer LocalBusiness result.
    const images = Array.from(
      new Set(
        (loaderData.gallery ?? [])
          .map((src) => absoluteOgImage(src, origin))
          .filter((u): u is string => Boolean(u)),
      ),
    );

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${origin}${url}#business`,
      name: loaderData.name,
      description: desc,
      url: `${origin}${url}`,
      ...(images.length ? { image: images } : image ? { image } : {}),
      ...(loaderData.category_name
        ? {
            additionalType: loaderData.category_name,
            knowsAbout: loaderData.category_name,
          }
        : {}),
      ...(loaderData.phone
        ? { telephone: telHref(loaderData.phone).replace("tel:", "") }
        : {}),
      ...(contactPoints(loaderData.phone, loaderData.whatsapp).length
        ? { contactPoint: contactPoints(loaderData.phone, loaderData.whatsapp) }
        : {}),
      ...(loaderData.phone
        ? {
            potentialAction: {
              "@type": "CommunicateAction",
              name: "اتصل بنا",
              target: telHref(loaderData.phone),
            },
          }
        : {}),

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

    // Home › governorate › city › business.
    const trail: { name: string; item: string }[] = [
      { name: "الرئيسية", item: `${origin}/` },
    ];
    if (loaderData.governorate_name && loaderData.governorate_slug)
      trail.push({
        name: loaderData.governorate_name,
        item: `${origin}/search?gov=${encodeURIComponent(loaderData.governorate_slug)}`,
      });
    if (loaderData.city_name && loaderData.city_slug)
      trail.push({
        name: loaderData.city_name,
        item: `${origin}/city/${encodeURIComponent(loaderData.city_slug)}`,
      });
    trail.push({ name: loaderData.name, item: `${origin}${url}` });

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
      links: [{ rel: "canonical", href: `${origin}${url}` }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
      ],
    };
  },
  headers: () => ({
    "X-Robots-Tag": "index, follow, max-image-preview:large, max-snippet:-1",
  }),

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
