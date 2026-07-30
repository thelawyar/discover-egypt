import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Check,
  Copy,
  History,
  Link2,
  Loader2,
  LocateFixed,
  RefreshCw,
  SearchX,
  X,
} from "lucide-react";
import { detectLocation } from "@/lib/geo-locate";
import type { Category, City, Governorate } from "@/lib/directory-types";
import { getTaxonomy, searchBusinesses, suggestSearch } from "@/lib/directory.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogImageMeta } from "@/lib/og";
import { SearchBar } from "@/components/SearchBar";
import { ResultsWithAds } from "@/components/ads/ResultsWithAds";
import { CityPicker } from "@/components/CityPicker";
import { citiesForGovernorate, normalizeLocationParams } from "@/lib/location-filter";
import { PageShell } from "@/components/SiteHeader";
import { searchTokens } from "@/lib/highlight";
import { Button } from "@/components/ui/button";
import {
  clearLastSearch,
  readLastSearch,
  saveLastSearch,
  sameSearchState,
  shortShareUrl,
  type SearchState,
} from "@/lib/search-share";


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
    const ld = loaderData as unknown as
      | { origin: string; pages: number; total: number; image: string | null; labels: { gov: string | null; city: string | null; cat: string | null } }
      | undefined;
    const sp = match.search ?? { q: "", city: "", gov: "", cat: "", prod: "", sort: "best", page: 1 };
    const term = sp.q?.trim();
    const place = ld?.labels.city ?? ld?.labels.gov ?? null;
    const cat = ld?.labels.cat ?? null;
    const prod = sp.prod?.trim();
    const page = sp.page ?? 1;

    // Build a title/description from whatever the visitor actually selected.
    const subject = term
      ? `«${term}»`
      : cat
        ? cat
        : prod
          ? `${prod}`
          : "الأنشطة التجارية";
    const parts = [
      term ? `نتائج البحث عن ${subject}` : `${subject}`,
      cat && term ? `في ${cat}` : null,
      place ? `في ${place}` : null,
      page > 1 ? `- صفحة ${page}` : null,
    ].filter(Boolean);
    const title = `${parts.join(" ")} | اكتشف مدينتك`;

    const count = ld?.total ?? 0;
    const desc = [
      count
        ? `${count.toLocaleString("ar-EG")} نتيجة`
        : "تصفح نتائج الدليل التجاري",
      term ? `لـ ${subject}` : cat ? `ضمن تصنيف ${cat}` : null,
      prod ? `تشمل ${prod}` : null,
      place ? `في ${place}` : "في المدن المصرية",
      "— دليل اكتشف مدينتك للأنشطة التجارية.",
    ]
      .filter(Boolean)
      .join(" ");

    const origin = ld?.origin ?? "";
    const build = (p: number) => {
      const usp = new URLSearchParams();
      if (sp.q) usp.set("q", sp.q);
      if (sp.city) usp.set("city", sp.city);
      if (sp.gov) usp.set("gov", sp.gov);
      if (sp.cat) usp.set("cat", sp.cat);
      if (sp.prod) usp.set("prod", sp.prod);
      if (sp.sort && sp.sort !== "best") usp.set("sort", sp.sort);
      if (p > 1) usp.set("page", String(p));
      const qs = usp.toString();
      return `${origin}/search${qs ? `?${qs}` : ""}`;
    };
    /** Canonical drops the free-text term so filter pages stay the indexable copy. */
    const canonicalBuild = (p: number) => {
      const usp = new URLSearchParams();
      if (sp.city) usp.set("city", sp.city);
      if (sp.gov) usp.set("gov", sp.gov);
      if (sp.cat) usp.set("cat", sp.cat);
      if (p > 1) usp.set("page", String(p));
      const qs = usp.toString();
      return `${origin}/search${qs ? `?${qs}` : ""}`;
    };

    const canonical = canonicalBuild(page);
    // Free-text queries stay out of the index; filtered/browsable pages are indexable.
    const indexable = !term;

    const links: Record<string, string>[] = [{ rel: "canonical", href: canonical }];
    // Paging hints always help crawlers understand the sequence, indexable or not.
    if (page > 1) links.push({ rel: "prev", href: build(page - 1) });
    if (ld && page < ld.pages) links.push({ rel: "next", href: build(page + 1) });


    // Breadcrumb trail: home › governorate › city › category, as selected.
    const crumbs: { name: string; item: string }[] = [
      { name: "الرئيسية", item: `${origin}/` },
    ];
    if (ld?.labels.gov)
      crumbs.push({
        name: ld.labels.gov,
        item: `${origin}/search?gov=${encodeURIComponent(sp.gov)}`,
      });
    if (ld?.labels.city)
      crumbs.push({ name: ld.labels.city, item: `${origin}/city/${encodeURIComponent(sp.city)}` });
    if (cat)
      crumbs.push({
        name: cat,
        item: `${origin}/search?cat=${encodeURIComponent(sp.cat)}`,
      });
    if (term) crumbs.push({ name: `نتائج «${term}»`, item: canonical });

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    };

    const shareTitle = title.replace(" | اكتشف مدينتك", "");
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 300) },
        { property: "og:title", content: shareTitle },
        { property: "og:description", content: desc.slice(0, 300) },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "اكتشف مدينتك" },
        { property: "og:locale", content: "ar_EG" },
        { property: "og:url", content: build(page) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: shareTitle },
        { name: "twitter:description", content: desc.slice(0, 300) },
        ...ogImageMeta(ld?.image ?? null, origin, shareTitle),
        {
          name: "robots",
          content: indexable
            ? "index, follow, max-image-preview:large, max-snippet:-1"
            : "noindex, follow",
        },
      ],

      links,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
      ],
    };
  },
  /** Same directive at the HTTP layer so crawlers that skip the HTML still obey it. */
  headers: ({ match }) => {
    const sp = match.search as SearchParams | undefined;
    const indexable = !sp?.q?.trim();
    return {
      "X-Robots-Tag": indexable
        ? "index, follow, max-image-preview:large, max-snippet:-1"
        : "noindex, follow",
    };
  },

  loader: async ({ context, deps }) => {
    const [taxonomy, results, origin] = await Promise.all([
      context.queryClient.ensureQueryData(taxonomyQuery),
      context.queryClient.ensureQueryData(resultsQuery(deps)),
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
    ]);
    return {
      origin,
      pages: Math.max(1, Math.ceil(results.total / 12)),
      total: results.total,
      image: results.items.find((b) => b.cover_image_url)?.cover_image_url ?? null,
      labels: {
        gov: taxonomy.governorates.find((g) => g.slug === deps.gov)?.name ?? null,
        city: taxonomy.cities.find((c) => c.slug === deps.city)?.name ?? null,
        cat: taxonomy.categories.find((c) => c.slug === deps.cat)?.name ?? null,
      },
    };
  },

  component: SearchPage,
  errorComponent: ({ error }) => <ResultsError message={error.message} />,

});

/** Dynamic, filter-aware H1 text for the results page. */
function resultsHeading(s: {
  q: string;
  prod: string;
  page: number;
  gov: string | null;
  city: string | null;
  cat: string | null;
}): string {
  const term = s.q.trim();
  const prod = s.prod.trim();
  const place = s.city ?? s.gov;
  const parts = [
    term
      ? `نتائج البحث عن «${term}»`
      : s.cat
        ? `${s.cat}`
        : prod
          ? `أنشطة توفر «${prod}»`
          : "كل الأنشطة التجارية",
    term && s.cat ? `في ${s.cat}` : null,
    term && prod ? `تشمل «${prod}»` : null,
    place ? `في ${place}` : null,
    s.page > 1 ? `- صفحة ${s.page}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

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

  // Remember the last search so returning visitors get a one-click shortcut.
  const [lastSearch, setLastSearch] = useState<SearchState | null>(null);
  useEffect(() => {
    setLastSearch(readLastSearch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    saveLastSearch(params as SearchState);
  }, [params]);

  const showLast =
    lastSearch && !sameSearchState(lastSearch, params as SearchState);

  /** Full reset: forget the stored search and go back to the (search-only) homepage. */
  function resetSearch() {
    clearLastSearch();
    setLastSearch(null);
    navigate({ to: "/" });
  }

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
            onClear={resetSearch}
            onLiveChange={(term) =>
              // Push (not replace) so the browser back button restores the
              // previous term together with its filters and sort order.
              navigate({
                search: (p: SearchParams) => ({ ...p, q: term, page: 1 }),
              })
            }
          />


          {showLast ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <History className="size-3.5" />
              <span>آخر بحث لك:</span>
              <button
                type="button"
                onClick={() =>
                  navigate({ search: () => ({ ...lastSearch, page: 1 }) })
                }
                className="rounded-full bg-primary-soft px-3 py-1 font-medium text-accent-foreground hover:opacity-80"
              >
                {lastSearchLabel(lastSearch, taxonomy)}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLastSearch();
                  setLastSearch(null);
                }}
                className="underline"
              >
                إخفاء
              </button>
            </div>
          ) : null}
        </div>
      </div>


      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Single dynamic H1 describing exactly what this filtered page lists. */}
        <h1 className="mb-4 text-xl font-extrabold sm:text-2xl">
          {resultsHeading({
            q: params.q,
            prod: params.prod,
            page: params.page,
            gov: taxonomy.governorates.find((g) => g.slug === normalized.gov)?.name ?? null,
            city: taxonomy.cities.find((c) => c.slug === normalized.city)?.name ?? null,
            cat: taxonomy.categories.find((c) => c.slug === params.cat)?.name ?? null,
          })}
        </h1>

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

          <ShareResults params={params} />
        </div>


        <ActiveFilters
          params={params}
          govName={
            taxonomy.governorates.find((g) => g.slug === normalized.gov)?.name ?? null
          }
          cityName={taxonomy.cities.find((c) => c.slug === normalized.city)?.name ?? null}
          catName={taxonomy.categories.find((c) => c.slug === params.cat)?.name ?? null}
          onClear={(patch) => {
            // Clearing the query term (the × on the search chip) or "مسح الكل"
            // means leaving the results page — send the visitor back home, since
            // the homepage is search-only and there is nothing to browse without a term.
            if (patch.q === "") resetSearch();
            else
              navigate({
                search: (p: SearchParams) => ({ ...p, ...patch, page: 1 }),
              });
          }}
        />

        {results.items.length === 0 ? (
          <NoResults
            params={params}
            taxonomy={taxonomy}
            onApply={(patch) =>
              navigate({ search: (p: SearchParams) => ({ ...p, ...patch, page: 1 }) })
            }
          />
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


/** Human label for the remembered search. */
function lastSearchLabel(
  state: SearchState,
  taxonomy: { cities: City[]; governorates: Governorate[]; categories: Category[] },
): string {
  const bits = [
    state.q.trim(),
    taxonomy.categories.find((c) => c.slug === state.cat)?.name,
    taxonomy.cities.find((c) => c.slug === state.city)?.name ??
      taxonomy.governorates.find((g) => g.slug === state.gov)?.name,
    state.prod.trim(),
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "كل الأنشطة";
}

/** Copies a short share link (/s/<code>) carrying every filter and the sort order. */
function ShareResults({ params }: { params: SearchParams }) {
  const [copied, setCopied] = useState(false);

  // Nothing to share when the search state is completely empty.
  const hasState = Boolean(
    params.q.trim() ||
      params.city ||
      params.gov ||
      params.cat ||
      params.prod.trim() ||
      params.sort !== "best" ||
      params.page > 1,
  );

  useEffect(() => setCopied(false), [params]);

  async function copy() {
    if (typeof window === "undefined" || !hasState) return;
    const base = window.location.origin;

    const url = shortShareUrl(base, params as SearchState);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("انسخ رابط المشاركة", url);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={copy}
      disabled={!hasState}
      title={
        hasState
          ? "نسخ رابط قصير يحمل كل الفلاتر والفرز"
          : "ابدأ بحثًا أو اختر فلترًا لتفعيل رابط المشاركة"
      }
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "تم نسخ الرابط" : "نسخ رابط المشاركة"}
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

/** Loader/network failure: explain and let the user retry without reloading. */
function ResultsError({ message }: { message?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <RefreshCw className="size-9 text-muted-foreground" />
        <p className="font-semibold">تعذّر تحميل نتائج البحث</p>
        <p className="text-xs text-muted-foreground">
          {message || "تحقق من اتصالك بالإنترنت ثم أعد المحاولة."}
        </p>
        <Button
          size="sm"
          className="mt-2 rounded-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await router.invalidate();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          إعادة المحاولة
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </PageShell>
  );
}

/** Empty state with query fixes and alternative filters instead of a dead end. */
function NoResults({
  params,
  taxonomy,
  onApply,
}: {
  params: SearchParams;
  taxonomy: { cities: City[]; governorates: Governorate[]; categories: Category[] };
  onApply: (patch: Partial<SearchParams>) => void;
}) {
  const term = params.q.trim();
  const words = term.split(/\s+/).filter(Boolean);

  const suggest = useQuery({
    queryKey: ["suggest", term],
    enabled: term.length >= 2,
    staleTime: 1000 * 60,
    queryFn: () => suggestSearch({ data: { q: term } }),
  });

  const relaxed: { label: string; patch: Partial<SearchParams> }[] = [];
  if (words.length > 1)
    relaxed.push({
      label: `ابحث عن «${words[0]}» فقط`,
      patch: { q: words[0] },
    });
  if (params.prod)
    relaxed.push({ label: "تجاهل فلتر المنتج", patch: { prod: "" } });
  if (params.cat)
    relaxed.push({ label: "كل التصنيفات", patch: { cat: "" } });
  if (params.city)
    relaxed.push({ label: "كل مدن المحافظة", patch: { city: "" } });
  if (params.gov)
    relaxed.push({ label: "كل المحافظات", patch: { gov: "", city: "" } });
  if (term) relaxed.push({ label: "امسح كلمة البحث", patch: { q: "" } });

  const altCats = (suggest.data?.categories ?? []).filter(
    (c) => c.slug !== params.cat,
  );
  const altCities = (suggest.data?.cities ?? []).filter(
    (c) => c.slug !== params.city,
  );
  const popularCats = taxonomy.categories.slice(0, 8);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
      <SearchX className="size-10 text-muted-foreground" />
      <div>
        <p className="font-semibold">
          {term ? `لا توجد نتائج مطابقة لـ «${term}»` : "لا توجد نتائج مطابقة"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          راجع الإملاء أو استخدم كلمات أعم، أو جرّب أحد الاقتراحات التالية.
        </p>
      </div>

      {relaxed.length ? (
        <div className="w-full">
          <p className="mb-2 text-xs font-bold text-muted-foreground">وسّع نطاق البحث</p>
          <div className="flex flex-wrap justify-center gap-2">
            {relaxed.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => onApply(r.patch)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {altCats.length || altCities.length ? (
        <div className="w-full">
          <p className="mb-2 text-xs font-bold text-muted-foreground">
            ربما تقصد
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {altCats.map((c) => (
              <button
                key={`cat-${c.slug}`}
                type="button"
                onClick={() => onApply({ q: "", cat: c.slug })}
                className="rounded-full bg-primary-soft px-3 py-1.5 text-xs text-accent-foreground"
              >
                تصنيف: {c.name}
              </button>
            ))}
            {altCities.map((c) => (
              <button
                key={`city-${c.slug}`}
                type="button"
                onClick={() => onApply({ q: "", city: c.slug })}
                className="rounded-full bg-primary-soft px-3 py-1.5 text-xs text-accent-foreground"
              >
                مدينة: {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="w-full">
        <p className="mb-2 text-xs font-bold text-muted-foreground">تصنيفات شائعة</p>
        <div className="flex flex-wrap justify-center gap-2">
          {popularCats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onApply({ q: "", cat: c.slug })}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link to="/">العودة للرئيسية</Link>
      </Button>
    </div>
  );
}
