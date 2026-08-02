import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, MapPin, Store, Ticket } from "lucide-react";
import { getEvent } from "@/lib/events.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { PageShell } from "@/components/SiteHeader";
import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import {
  EVENT_KIND_EMOJI,
  EVENT_KIND_LABELS,
  formatEventDate,
  isLive,
} from "@/lib/event-kinds";

function eventQuery(id: string) {
  return queryOptions({
    queryKey: ["event", id],
    queryFn: () => getEvent({ data: { id } }),
  });
}

export const Route = createFileRoute("/events/$id")({
  loader: async ({ context, params }) => {
    const [item, origin] = await Promise.all([
      context.queryClient.ensureQueryData(eventQuery(params.id)),
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
    ]);
    if (!item) throw notFound();
    return { origin, item };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "المناسبة غير متاحة | اكتشف مدينتك" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const e = loaderData.item;
    const origin = loaderData.origin ?? "";
    const title = `${e.title} | ${EVENT_KIND_LABELS[e.kind] ?? "حدث"} في ${e.city_name ?? "مصر"}`;
    const desc =
      e.description?.slice(0, 155) ??
      `${EVENT_KIND_LABELS[e.kind] ?? "حدث"} في ${e.venue || e.business_name || e.city_name || "مدينتك"}.`;
    const url = `${origin}/events/${params.id}`;
    const image = e.image_url ?? e.business_cover;

    const meta: Record<string, string>[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (image?.startsWith("https://")) {
      meta.push(
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
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
            "@type": "Event",
            name: e.title,
            description: desc,
            startDate: e.starts_at,
            endDate: e.ends_at ?? undefined,
            eventStatus: "https://schema.org/EventScheduled",
            image: image ?? undefined,
            url,
            location: {
              "@type": "Place",
              name: e.venue || e.business_name || e.city_name || "مصر",
              address: {
                "@type": "PostalAddress",
                addressLocality: e.city_name ?? undefined,
                addressRegion: e.governorate_name ?? undefined,
                addressCountry: "EG",
              },
            },
            organizer: e.business_name
              ? {
                  "@type": "Organization",
                  name: e.business_name,
                  url: e.business_username ? `${origin}/${e.business_username}` : undefined,
                }
              : undefined,
          }),
        },
      ],
    };
  },
  component: EventDetail,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-lg font-bold">المناسبة غير متاحة</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/events" search={{ city: "", gov: "", kind: "", when: "upcoming", page: 1 }}>
            كل الأحداث
          </Link>
        </Button>
      </div>
    </PageShell>
  ),
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل المناسبة.
      </div>
    </PageShell>
  ),
});

function EventDetail() {
  const { id } = Route.useParams();
  const { data: e } = useSuspenseQuery(eventQuery(id));
  if (!e) return null;
  const cover = e.image_url ?? e.business_cover;

  return (
    <PageShell>
      <article className="mx-auto max-w-4xl px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-muted">
          {cover ? (
            <SmartImage
              src={cover}
              alt={e.title}
              width={1600}
              height={800}
              className="aspect-[2/1] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/1] w-full items-center justify-center text-6xl">
              {EVENT_KIND_EMOJI[e.kind] ?? "📅"}
            </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold">
              {EVENT_KIND_EMOJI[e.kind]} {EVENT_KIND_LABELS[e.kind] ?? "حدث"}
            </span>
            {isLive(e) ? (
              <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">
                جارٍ الآن
              </span>
            ) : null}
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold sm:text-3xl">{e.title}</h1>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
            <CalendarDays className="size-4 text-primary" />
            <div>
              <p className="font-semibold">{formatEventDate(e.starts_at)}</p>
              {e.ends_at ? (
                <p className="text-xs text-muted-foreground">
                  حتى {formatEventDate(e.ends_at)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
            <MapPin className="size-4 text-primary" />
            <div>
              <p className="font-semibold">{e.venue || e.business_name || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {[e.city_name, e.governorate_name].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {e.price_info ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
              <Ticket className="size-4 text-primary" />
              <span className="font-semibold">{e.price_info}</span>
            </div>
          ) : null}
          {e.business_username ? (
            <Link
              to="/$username"
              params={{ username: e.business_username }}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-muted"
            >
              <Store className="size-4 text-primary" />
              <span className="font-semibold">{e.business_name}</span>
            </Link>
          ) : null}
        </div>

        {e.description ? (
          <p className="mt-6 whitespace-pre-line leading-8 text-foreground/90">
            {e.description}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-2">
          {e.external_url ? (
            <Button asChild className="rounded-full">
              <a href={e.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> رابط الحجز / التفاصيل
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="rounded-full">
            <Link
              to="/events"
              search={{ city: "", gov: "", kind: "", when: "upcoming", page: 1 }}
            >
              كل الأحداث
            </Link>
          </Button>
        </div>
      </article>
    </PageShell>
  );
}
