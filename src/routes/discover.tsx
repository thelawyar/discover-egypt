import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Dices, LocateFixed, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { discoverRandom } from "@/lib/portal.functions";
import { getTaxonomy } from "@/lib/directory.functions";
import { PageShell } from "@/components/SiteHeader";
import { BusinessCard } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";
import { GOOD_FOR, PRICE_LEVELS, VIBES } from "@/lib/business-attributes";
import { detectLocation } from "@/lib/geo-locate";

const searchSchema = z.object({
  city: fallback(z.string(), "").default(""),
  gov: fallback(z.string(), "").default(""),
  good: fallback(z.string(), "").default(""),
  vibe: fallback(z.string(), "").default(""),
  price: fallback(z.number().int().min(0).max(4), 0).default(0),
  seed: fallback(z.number().int(), 1).default(1),
});

type DiscoverSearch = z.infer<typeof searchSchema>;

const taxonomyQuery = queryOptions({
  queryKey: ["taxonomy"],
  queryFn: () => getTaxonomy(),
  staleTime: 1000 * 60 * 30,
});

function discoverQuery(s: DiscoverSearch) {
  return queryOptions({
    queryKey: ["discover", s.city, s.gov, s.good, s.vibe, s.price, s.seed],
    queryFn: () =>
      discoverRandom({
        data: {
          city: s.city || undefined,
          gov: s.gov || undefined,
          good: s.good || undefined,
          vibe: s.vibe || undefined,
          price: s.price || undefined,
          seed: s.seed,
        },
      }),
  });
}

export const Route = createFileRoute("/discover")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(taxonomyQuery),
      context.queryClient.ensureQueryData(discoverQuery(deps)),
    ]);
  },
  head: () => {
    const title = "🎲 اكتشف أماكن عشوائية قريبة منك | اكتشف مدينتك";
    const desc =
      "مش عارف تروح فين؟ اضغط زر واحد واحصل على اقتراحات أماكن عشوائية مناسبة لذوقك وموقعك الحالي.";
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
    };
  },
  component: DiscoverPage,
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل الاقتراحات.
      </div>
    </PageShell>
  ),
});

function DiscoverPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: taxonomy } = useSuspenseQuery(taxonomyQuery);
  const { data: items } = useSuspenseQuery(discoverQuery(search));
  const [locating, setLocating] = useState(false);

  const set = (patch: Partial<DiscoverSearch>) =>
    navigate({
      search: (prev: DiscoverSearch) => ({
        ...prev,
        ...patch,
        seed: Math.floor(Math.random() * 2000000),
      }),
    });

  const toggle = (key: "good" | "vibe", value: string) => {
    const current = search[key].split(",").filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value].slice(0, 3);
    set({ [key]: next.join(",") } as Partial<DiscoverSearch>);
  };

  async function useMyLocation() {
    setLocating(true);
    try {
      const match = await detectLocation(taxonomy);
      set({ city: match.city, gov: match.gov });
      toast.success(`تم تحديد موقعك: ${match.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تحديد الموقع");
    } finally {
      setLocating(false);
    }
  }

  const cityName =
    taxonomy.cities.find((c) => c.slug === search.city)?.name ??
    taxonomy.governorates.find((g) => g.slug === search.gov)?.name ??
    "كل مصر";

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border border-border bg-gradient-to-l from-primary-soft to-card p-6 text-center">
          <h1 className="text-2xl font-extrabold sm:text-3xl">🎲 اكتشف مكاناً جديداً</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            من غير ما تكتب بحث — اضغط الزر واحصل على اقتراحات عشوائية مناسبة لذوقك في{" "}
            <span className="font-semibold text-foreground">{cityName}</span>.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" className="rounded-full" onClick={() => set({})}>
              <Dices className="size-5" /> اقترح لي أماكن
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full"
              disabled={locating}
              onClick={useMyLocation}
            >
              <LocateFixed className="size-5" />
              {locating ? "جارٍ التحديد..." : "استخدم موقعي"}
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={search.gov}
              onChange={(e) => set({ gov: e.target.value, city: "" })}
              className="rounded-full border border-border bg-background px-3 py-2 text-xs"
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
              className="rounded-full border border-border bg-background px-3 py-2 text-xs"
            >
              <option value="">كل المدن</option>
              {(search.gov
                ? taxonomy.cities.filter(
                    (c) =>
                      c.governorate_id ===
                      taxonomy.governorates.find((g) => g.slug === search.gov)?.id,
                  )
                : taxonomy.cities
              ).map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={String(search.price)}
              onChange={(e) => set({ price: Number(e.target.value) })}
              className="rounded-full border border-border bg-background px-3 py-2 text-xs"
            >
              <option value="0">أي سعر</option>
              {PRICE_LEVELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} — {p.hint}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {GOOD_FOR.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => toggle("good", g.value)}
                className={`rounded-full border px-3 py-1 text-[11px] transition ${
                  search.good.split(",").includes(g.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => toggle("vibe", v.value)}
                className={`rounded-full border px-3 py-1 text-[11px] transition ${
                  search.vibe.split(",").includes(v.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            لا توجد أنشطة مطابقة — جرّب تخفيف التفضيلات أو توسيع المدينة.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((b) => (
                <BusinessCard key={b.id} item={b} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="outline" className="rounded-full" onClick={() => set({})}>
                <RefreshCw className="size-4" /> اقتراحات أخرى
              </Button>
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          تفضّل البحث بالكلمات؟{" "}
          <Link
            to="/search"
            search={{ q: "", city: "", gov: "", cat: "", page: 1 }}
            className="font-semibold text-primary hover:underline"
          >
            افتح صفحة البحث
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
