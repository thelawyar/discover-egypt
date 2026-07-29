import { useNavigate } from "@tanstack/react-router";
import { Search, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/directory-types";

type Props = {
  cities: City[];
  initialQuery?: string;
  initialCity?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
};

export function SearchBar({
  cities,
  initialQuery = "",
  initialCity = "",
  size = "hero",
  autoFocus = false,
}: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery);
  const [cityId, setCityId] = useState(initialCity);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const wrapRef = useRef<HTMLFormElement>(null);

  useEffect(() => setQ(initialQuery), [initialQuery]);
  useEffect(() => setCityId(initialCity), [initialCity]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setCityOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedCity = cities.find((c) => c.slug === cityId || c.id === cityId);
  const filtered = cityFilter.trim()
    ? cities.filter((c) => c.name.includes(cityFilter.trim())).slice(0, 60)
    : cities.slice(0, 60);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      to: "/search",
      search: { q: q.trim(), city: cityId, gov: "", cat: "", page: 1 },
    });
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
          onChange={(e) => setQ(e.target.value)}
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
            onClick={() => setQ("")}
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
            {selectedCity ? selectedCity.name : "كل المدن"}
          </span>
        </button>
      </div>

      {cityOpen ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-raised">
          <div className="border-b border-border p-2">
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="اكتب اسم المدينة..."
              className="h-9 w-full rounded-lg bg-muted px-3 text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                setCityId("");
                setCityOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-muted"
            >
              كل المدن
            </button>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCityId(c.slug);
                  setCityOpen(false);
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
