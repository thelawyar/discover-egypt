import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, X, ChevronRight, Store, Tag, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { suggestSearch } from "@/lib/directory.functions";
import { Highlight, searchTokens } from "@/lib/highlight";
import type { City, Governorate } from "@/lib/directory-types";


type Props = {
  cities: City[];
  governorates?: Governorate[];
  initialQuery?: string;
  initialCity?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
  /** When set, the query is applied instantly (debounced) without a submit. */
  onLiveChange?: (term: string) => void;
  /** Called when the visitor clears the box (✕ or ESC). */
  onClear?: () => void;
};

export function SearchBar({
  cities,
  governorates = [],
  initialQuery = "",
  initialCity = "",
  size = "hero",
  autoFocus = false,
  onLiveChange,
  onClear,
}: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery);
  const [cityId, setCityId] = useState(initialCity);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [govId, setGovId] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [debounced, setDebounced] = useState(initialQuery);
  const wrapRef = useRef<HTMLFormElement>(null);

  useEffect(() => setQ(initialQuery), [initialQuery]);
  useEffect(() => setCityId(initialCity), [initialCity]);

  // Debounce keystrokes before asking the server for suggestions.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  // Instant results: apply the debounced term to the current page.
  useEffect(() => {
    if (!onLiveChange) return;
    if (debounced === initialQuery.trim()) return;
    const t = setTimeout(() => onLiveChange(debounced), 180);
    return () => clearTimeout(t);
  }, [debounced, initialQuery, onLiveChange]);


  const suggestQuery = useQuery({
    queryKey: ["suggest", debounced],
    enabled: suggestOpen && debounced.length >= 2,
    staleTime: 1000 * 60,
    queryFn: () => suggestSearch({ data: { q: debounced } }),
  });

  const suggestions = suggestQuery.data;
  const tokens = searchTokens(debounced);
  const hasSuggestions = Boolean(
    suggestions &&
      (suggestions.businesses.length ||
        suggestions.categories.length ||
        suggestions.cities.length),
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setCityOpen(false);
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);


  const selectedCity = cities.find((c) => c.slug === cityId || c.id === cityId);
  const selectedGov = governorates.find((g) => g.id === govId) ?? null;
  const useGovSteps = governorates.length > 0;

  const filtered = useMemo(() => {
    const term = cityFilter.trim();
    let list = cities;
    if (useGovSteps) {
      if (!selectedGov) return [];
      list = cities.filter((c) => c.governorate_id === selectedGov.id);
    }
    if (term) list = list.filter((c) => c.name.includes(term));
    return list.slice(0, 80);
  }, [cities, cityFilter, selectedGov, useGovSteps]);

  const filteredGovs = useMemo(() => {
    const term = cityFilter.trim();
    return term
      ? governorates.filter((g) => g.name.includes(term))
      : governorates;
  }, [governorates, cityFilter]);

  const cityCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cities)
      map.set(c.governorate_id, (map.get(c.governorate_id) ?? 0) + 1);
    return map;
  }, [cities]);

  function closeMenu() {
    setCityOpen(false);
    setCityFilter("");
    setGovId(null);
  }

  function go(term: string, cityOverride?: string) {
    setSuggestOpen(false);
    setCityOpen(false);
    const trimmed = term.trim();
    setQ(trimmed);
    setDebounced(trimmed);
    navigate({
      to: "/search",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        q: trimmed,
        city: cityOverride ?? cityId,
        gov: (cityOverride ?? cityId) ? "" : (selectedGov?.slug ?? ""),
        page: 1,
      }),
    });
  }

  /** Clearing must apply instantly, not wait for a submit. */
  function clearQuery() {
    setQ("");
    setDebounced("");
    setSuggestOpen(false);
    if (onLiveChange) onLiveChange("");
    else go("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    go(q);
  }




  return (
    <form
      onSubmit={submit}
      ref={wrapRef}
      className={cn(
        "relative w-full",
        size === "hero" ? "max-w-2xl" : "max-w-3xl",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border border-border bg-card transition-shadow",
          "hover:shadow-search focus-within:shadow-search focus-within:border-transparent",
          size === "hero" ? "h-14 px-5" : "h-11 px-4",
        )}
      >
        <Search
          className={cn(
            "shrink-0 text-muted-foreground",
            size === "hero" ? "size-5" : "size-4",
          )}
        />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setSuggestOpen(true);
            setCityOpen(false);
          }}
          onFocus={() => setSuggestOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSuggestOpen(false);
          }}
          autoComplete="off"
          maxLength={100}
          placeholder="ابحث عن نشاط، مجال، أو منتج..."
          aria-label="ابحث في الدليل"
          className={cn(
            "h-full flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground",
            size === "hero" ? "text-base" : "text-sm",
          )}
        />

        {q ? (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="مسح البحث"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}


        <span className="mx-1 h-6 w-px bg-border" />

        <button
          type="button"
          onClick={() => setCityOpen((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 text-muted-foreground hover:bg-muted",
            size === "hero" ? "h-9 text-sm" : "h-8 text-xs",
          )}
        >
          <MapPin className="size-4" />
          <span className="max-w-28 truncate">
            {selectedCity
              ? selectedCity.name
              : selectedGov
                ? selectedGov.name
                : "كل المدن"}
          </span>
        </button>
      </div>

      {suggestOpen && !cityOpen && debounced.length >= 2 ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-raised">
          {suggestQuery.isFetching && !hasSuggestions ? (
            <p className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> جارٍ البحث...
            </p>
          ) : null}

          {suggestions?.businesses.length ? (
            <div className="p-1">
              <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground">
                نتائج سريعة
              </p>
              {suggestions.businesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSuggestOpen(false);
                    navigate({ to: "/$username", params: { username: b.username } });
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right hover:bg-muted"
                >
                  {b.cover_image_url ? (
                    <img
                      src={b.cover_image_url}
                      alt=""
                      loading="lazy"
                      className="size-9 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Store className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      <Highlight text={b.name} terms={tokens} />
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[b.category_name, b.city_name].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {suggestions?.categories.length || suggestions?.cities.length ? (
            <div className="border-t border-border p-1">
              {suggestions.categories.map((c) => (
                <button
                  key={`cat-${c.slug}`}
                  type="button"
                  onClick={() => go(c.name)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm hover:bg-muted"
                >
                  <Tag className="size-3.5 text-muted-foreground" />
                  <Highlight text={c.name} terms={tokens} />
                  <span className="text-[11px] text-muted-foreground">تصنيف</span>
                </button>
              ))}
              {suggestions.cities.map((c) => (
                <button
                  key={`city-${c.slug}`}
                  type="button"
                  onClick={() => go("", c.slug)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm hover:bg-muted"
                >
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <Highlight text={c.name} terms={tokens} />
                  <span className="text-[11px] text-muted-foreground">مدينة</span>
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => go(q)}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-right text-xs font-bold text-primary hover:bg-muted"
          >
            <Search className="size-3.5" />
            عرض كل النتائج عن «{debounced}»
          </button>

          {!suggestQuery.isFetching && !hasSuggestions ? (
            <p className="px-3 pb-3 text-[11px] text-muted-foreground">
              لا توجد اقتراحات مطابقة، جرّب كلمة أخرى.
            </p>
          ) : null}
        </div>
      ) : null}



      {cityOpen ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-raised">
          <div className="border-b border-border p-2">
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder={
                useGovSteps && !selectedGov
                  ? "اكتب اسم المحافظة..."
                  : "اكتب اسم المدينة..."
              }
              className="h-9 w-full rounded-lg bg-muted px-3 text-sm outline-none"
            />
          </div>

          {useGovSteps && selectedGov ? (
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
              <button
                type="button"
                onClick={() => setGovId(null)}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ChevronRight className="size-3.5" /> كل المحافظات
              </button>
              <span className="font-semibold">{selectedGov.name}</span>
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                setCityId("");
                closeMenu();
              }}
              className="w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-muted"
            >
              {useGovSteps && selectedGov
                ? `كل مدن ${selectedGov.name}`
                : "كل المدن"}
            </button>

            {useGovSteps && !selectedGov
              ? filteredGovs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGovId(g.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm hover:bg-muted"
                  >
                    <span>{g.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {(cityCount.get(g.id) ?? 0).toLocaleString("ar-EG")} مدينة
                    </span>
                  </button>
                ))
              : filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCityId(c.slug);
                      closeMenu();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm hover:bg-muted"
                  >
                    <span>{c.name}</span>
                    {c.is_new_city ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-accent-foreground">
                        مدينة جديدة
                      </span>
                    ) : null}
                  </button>
                ))}
          </div>

        </div>
      ) : null}
    </form>
  );
}
