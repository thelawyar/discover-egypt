import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Check, Copy, Link2, Loader2, LocateFixed, SearchX, X } from "lucide-react";
import { detectLocation } from "@/lib/geo-locate";
import type { City, Governorate } from "@/lib/directory-types";
import { getTaxonomy, searchBusinesses } from "@/lib/directory.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { SearchBar } from "@/components/SearchBar";
import { ResultsWithAds } from "@/components/ads/ResultsWithAds";
import { CityPicker } from "@/components/CityPicker";
import { citiesForGovernorate, normalizeLocationParams } from "@/lib/location-filter";
import { PageShell } from "@/components/SiteHeader";
import { searchTokens } from "@/lib/highlight";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  gov: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  prod: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(["best", "newest", "popular"]), "best").default("best"),
  page: fallback(z.number().int(), 1).default(1),
});

type SearchParams = z.infer<typeof searchSchema>;

const SORTS = [
  ["best", "الأفضل مطابقة"],
  ["popular", "الأعلى تفاعلاً"],
  ["newest", "الأحدث إضافة"],
] as const;

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
  prod: string;
  sort: "best" | "newest" | "popular";
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
          prod: deps.prod || undefined,
          sort: deps.sort,
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
  errorComponent: ({ error }) => <ResultsError message={error.message} />,

});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: taxonomy } = useSuspenseQuery(taxonomyQuery);
  const { data: results } = useSuspenseQuery(resultsQuery(params));

  const perPage = 12;
  const pages = Math.max(1, Math.ceil(results.total / perPage));
  const normalized = normalizeLocationParams(taxonomy, {
    gov: params.gov,
    city: params.city,
  });

  // Keep shareable URLs consistent: fix or drop mismatched gov/city params.
  useEffect(() => {
    if (normalized.gov === params.gov && normalized.city === params.city) return;
    navigate({
      replace: true,
      search: (p: SearchParams) => ({ ...p, ...normalized, page: 1 }),
    });
  }, [normalized.gov, normalized.city, params.gov, params.city]);

  const selectedGov = taxonomy.governorates.find((g) => g.slug === normalized.gov);
  const govCities = citiesForGovernorate(
    taxonomy.cities,
    selectedGov?.id ?? null,
  );

  return (
    <PageShell>
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <SearchBar
            cities={taxonomy.cities}
            governorates={taxonomy.governorates}
            initialQuery={params.q}
            initialCity={params.city}
            size="compact"
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <select
            value={normalized.gov}
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

          <CityPicker
            className="w-44"
            cities={selectedGov ? govCities : []}
            value={normalized.city}
            disabled={!selectedGov}
            allLabel={selectedGov ? "كل المدن" : "اختر المحافظة أولاً"}
            onChange={(v) =>
              navigate({ search: (p: SearchParams) => ({ ...p, city: v, page: 1 }) })
            }
          />

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

          <ProductFilter
            value={params.prod}
            onApply={(v) =>
              navigate({ search: (p: SearchParams) => ({ ...p, prod: v, page: 1 }) })
            }
          />

          <select
            value={params.sort}
            onChange={(e) =>
              navigate({
                search: (p: SearchParams) => ({
                  ...p,
                  sort: e.target.value as SearchParams["sort"],
                  page: 1,
                }),
              })
            }
            className="h-9 rounded-full border border-border bg-card px-3 text-xs"
          >
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>
                ترتيب: {label}
              </option>
            ))}
          </select>


          <NearMeButton
            taxonomy={taxonomy}
            onDetect={(loc) =>
              navigate({
                search: (p: SearchParams) => ({
                  ...p,
                  gov: loc.gov,
                  city: loc.city,
                  page: 1,
                }),
              })
            }
          />

          <span className="ms-auto text-xs text-muted-foreground">
            {results.total.toLocaleString("ar-EG")} نتيجة
          </span>

          <ShareResults />
        </div>


        <ActiveFilters
          params={params}
          govName={
            taxonomy.governorates.find((g) => g.slug === normalized.gov)?.name ?? null
          }
          cityName={taxonomy.cities.find((c) => c.slug === normalized.city)?.name ?? null}
          catName={taxonomy.categories.find((c) => c.slug === params.cat)?.name ?? null}
          onClear={(patch) =>
            navigate({ search: (p: SearchParams) => ({ ...p, ...patch, page: 1 }) })
          }
        />

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
          <ResultsWithAds
            items={results.items}
            targeting={{
              governorateId: selectedGov?.id ?? null,
              cityId:
                taxonomy.cities.find((c) => c.slug === normalized.city)?.id ?? null,
              categoryId:
                taxonomy.categories.find((c) => c.slug === params.cat)?.id ?? null,
            }}
            terms={searchTokens(params.q)}
          />
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

/** Detects the visitor's city and applies it as a filter. */
function NearMeButton({
  taxonomy,
  onDetect,
}: {
  taxonomy: { cities: City[]; governorates: Governorate[] };
  onDetect: (loc: { gov: string; city: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const match = await detectLocation(taxonomy);
      onDetect({ gov: match.gov, city: match.city });
      setMessage(`نتائج قريبة منك: ${match.label}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذّر تحديد موقعك");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={busy}
        onClick={run}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <LocateFixed className="size-3.5" />
        )}
        {busy ? "جارٍ تحديد موقعك..." : "اكتشف موقعي"}
      </Button>
      {message ? (
        <span className="text-[11px] text-muted-foreground">{message}</span>
      ) : null}
    </div>
  );
}


/** Copies the current results URL (query + filters + page) for sharing. */
function ShareResults() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={copy}
      title="نسخ رابط هذه النتائج بنفس الفلاتر"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "تم نسخ الرابط" : "مشاركة النتائج"}
    </Button>
  );
}

/** Chips reflecting exactly what the shareable URL contains. */
function ActiveFilters({
  params,
  govName,
  cityName,
  catName,
  onClear,
}: {
  params: SearchParams;
  govName: string | null;
  cityName: string | null;
  catName: string | null;
  onClear: (patch: Partial<SearchParams>) => void;
}) {
  const chips: { key: string; label: string; patch: Partial<SearchParams> }[] = [];
  if (params.q) chips.push({ key: "q", label: `بحث: ${params.q}`, patch: { q: "" } });
  if (govName)
    chips.push({ key: "gov", label: govName, patch: { gov: "", city: "" } });
  if (cityName) chips.push({ key: "city", label: cityName, patch: { city: "" } });
  if (catName) chips.push({ key: "cat", label: catName, patch: { cat: "" } });
  if (params.prod)
    chips.push({ key: "prod", label: `منتج: ${params.prod}`, patch: { prod: "" } });


  if (!chips.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link2 className="size-3.5 text-muted-foreground" />
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onClear(c.patch)}
          className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-accent-foreground hover:opacity-80"
        >
          {c.label}
          <X className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onClear({ q: "", gov: "", city: "", cat: "", prod: "" })}
        className="text-[11px] text-muted-foreground underline"
      >
        مسح الكل
      </button>
    </div>
  );
}

/** Free-text product/service filter committed on Enter or blur. */
function ProductFilter({
  value,
  onApply,
}: {
  value: string;
  onApply: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft.trim() !== value && onApply(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") onApply(draft.trim());
      }}
      placeholder="منتج أو خدمة"
      className="h-9 w-36 rounded-full border border-border bg-card px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
    />
  );
}
