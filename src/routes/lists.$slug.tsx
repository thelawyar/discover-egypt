import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { getListBySlug } from "@/lib/lists.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { PageShell } from "@/components/SiteHeader";
import { BusinessCard } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";

function listQuery(slug: string) {
  return queryOptions({
    queryKey: ["list", slug],
    queryFn: () => getListBySlug({ data: { slug } }),
  });
}

export const Route = createFileRoute("/lists/$slug")({
  loader: async ({ context, params }) => {
    const [data, origin] = await Promise.all([
      context.queryClient.ensureQueryData(listQuery(params.slug)),
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
    ]);
    if (!data) throw notFound();
    return { origin, title: data.title, description: data.description, count: data.item_count, city: data.city_name, image: data.cover_image_url ?? data.items.find((i) => i.business.cover_image_url)?.business.cover_image_url ?? null, items: data.items.slice(0, 15).map((i) => ({ name: i.business.name, username: i.business.username })) };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "القائمة غير متاحة | اكتشف مدينتك" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const origin = loaderData.origin ?? "";
    const title = `${loaderData.title} | اكتشف مدينتك`;
    const desc =
      loaderData.description?.slice(0, 155) ??
      `قائمة تضم ${loaderData.count} مكاناً${loaderData.city ? ` في ${loaderData.city}` : ""}.`;
    const url = `${origin}/lists/${params.slug}`;

    const meta: Record<string, string>[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (loaderData.image?.startsWith("https://")) {
      meta.push(
        { property: "og:image", content: loaderData.image },
        { name: "twitter:image", content: loaderData.image },
      );
    }

    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: loaderData.title,
            description: desc,
            url,
            numberOfItems: loaderData.count,
            itemListElement: loaderData.items.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: b.name,
              url: `${origin}/${b.username}`,
            })),
          }),
        },
      ],
    };
  },
  component: ListPage,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-lg font-bold">القائمة غير متاحة</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/lists">كل القوائم</Link>
        </Button>
      </div>
    </PageShell>
  ),
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل القائمة.
      </div>
    </PageShell>
  ),
});

function ListPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(listQuery(slug));
  if (!data) return null;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: data!.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط القائمة");
      }
    } catch {
      /* المستخدم ألغى المشاركة */
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{data.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.item_count.toLocaleString("ar-EG")} مكان
              {data.city_name ? ` · ${data.city_name}` : ""}
            </p>
            {data.description ? (
              <p className="mt-3 max-w-2xl leading-7 text-foreground/90">{data.description}</p>
            ) : null}
          </div>
          <Button variant="outline" className="rounded-full" onClick={share}>
            <Share2 className="size-4" /> مشاركة
          </Button>
        </div>

        {data.items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">القائمة فارغة حالياً.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((i) => (
              <div key={i.business.id} className="flex flex-col gap-2">
                <BusinessCard item={i.business} />
                {i.note ? (
                  <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {i.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          <Link to="/lists" className="font-semibold text-primary hover:underline">
            تصفّح كل القوائم
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
