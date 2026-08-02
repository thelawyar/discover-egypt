import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { CalendarDays } from "lucide-react";
import { listEvents } from "@/lib/events.functions";
import { getTaxonomy } from "@/lib/directory.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { PageShell } from "@/components/SiteHeader";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { EVENT_KINDS, EVENT_WHEN } from "@/lib/event-kinds";

const searchSchema = z.object({
  city: fallback(z.string(), "").default(""),
  gov: fallback(z.string(), "").default(""),
  kind: fallback(z.enum(["", "offer", "party", "opening", "match", "event"]), "").default(""),
  when: fallback(z.enum(["upcoming", "today", "week", "month", "past"]), "upcoming").default(
    "upcoming",
  ),
  page: fallback(z.number().int().min(1), 1).default(1),
});

type EventsSearch = z.infer<typeof searchSchema>;

const taxonomyQuery = queryOptions({
  queryKey: ["taxonomy"],
  queryFn: () => getTaxonomy(),
  staleTime: 1000 * 60 * 30,
});

function eventsQuery(s: EventsSearch) {
  return queryOptions({
    queryKey: ["events", s.city, s.gov, s.kind, s.when, s.page],
    queryFn: () =>
      listEvents({
        data: {
          city: s.city || undefined,
          gov: s.gov || undefined,
          kind: (s.kind || undefined) as never,
          when: s.when,
          page: s.page,
        },
      }),
  });
}

export const Route = createFileRoute("/events/")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const [origin] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
      context.queryClient.ensureQueryData(taxonomyQuery),
      context.queryClient.ensureQueryData(eventsQuery(deps)),
    ]);
    return { origin };
  },
  head: ({ loaderData }) => {
    const title = "العروض والأحداث في مدن مصر | اكتشف مدينتك";
    const desc =
      "حفلات وافتتاحات ومباريات وعروض اليوم في مدينتك — تصفح كل المناسبات وفلترها حسب المدينة والوقت.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `${loaderData?.origin ?? ""}/events` }],
    };
  },
  component: EventsPage,
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل الأحداث.
      </div>
    </PageShell>
  ),
});

function EventsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: taxonomy } = useSuspenseQuery(taxonomyQuery);
  const { data } = useSuspenseQuery(eventsQuery(search));
  const pages = Math.max(1, Math.ceil(data.total / data.perPage));

  const cities = search.gov
    ? taxonomy.cities.filter(
        (c) =>
          c.governorate_id ===
          taxonomy.governorates.find((g) => g.slug === search.gov)?.id,
      )
    : taxonomy.cities;

  const set = (patch: Partial<EventsSearch>) =>
    navigate({ search: (prev: EventsSearch) => ({ ...prev, ...patch, page: 1 }) });

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <CalendarDays className="size-6 text-primary" />
          العروض والأحداث
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          حفلات، افتتاحات، مباريات وعروض — {data.total.toLocaleString("ar-EG")} مناسبة.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {EVENT_WHEN.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => set({ when: w.value })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                search.when === w.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set({ kind: "" })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              !search.kind
                ? "border-primary bg-primary-soft"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            الكل
          </button>
          {EVENT_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => set({ kind: k.value })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                search.kind === k.value
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {k.emoji} {k.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={search.gov}
            onChange={(e) => set({ gov: e.target.value, city: "" })}
            className="rounded-full border border-border bg-card px-3 py-2 text-xs"
          >
            <option value="">كل المحافظات</option>
            {taxonomy.governorates.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={search.city}
            onChange={(e) => set({ city: e.target.value })}
            className="rounded-full border border-border bg-card px-3 py-2 text-xs"
          >
            <option value="">كل المدن</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {data.items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border py-20 text-center">
            <p className="font-semibold">لا توجد مناسبات مطابقة</p>
            <p className="mt-1 text-sm text-muted-foreground">
              جرّب توسيع الفلتر الزمني أو اختيار مدينة أخرى.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => navigate({ search: () => ({ city: "", gov: "", kind: "", when: "upcoming", page: 1 }) })}
            >
              مسح الفلاتر
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((e) => (
              <EventCard key={e.id} item={e} />
            ))}
          </div>
        )}

        {pages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={search.page <= 1}
              onClick={() => navigate({ search: (p: EventsSearch) => ({ ...p, page: p.page - 1 }) })}
            >
              السابق
            </Button>
            <span className="text-xs text-muted-foreground">
              صفحة {search.page} من {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={search.page >= pages}
              onClick={() => navigate({ search: (p: EventsSearch) => ({ ...p, page: p.page + 1 }) })}
            >
              التالي
            </Button>
          </nav>
        ) : null}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          عندك عرض أو حدث؟{" "}
          <Link to="/dashboard/events" className="font-semibold text-primary hover:underline">
            أضفه من لوحة إدارة نشاطك
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
