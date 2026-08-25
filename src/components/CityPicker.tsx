import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Search } from "lucide-react";
import type { City } from "@/lib/directory-types";
import { filterCitiesByTerm } from "@/lib/location-filter";
import { cn } from "@/lib/utils";

type Props = {
  cities: City[];
  /** Selected value; matches City.id or City.slug depending on `valueKey`. */
  value: string;
  onChange: (value: string) => void;
  valueKey?: "id" | "slug";
  disabled?: boolean;
  placeholder?: string;
  allLabel?: string;
  className?: string;
  /**
   * When provided, a "add this city" action shows up for a search term that
   * matches nothing. Should return the new value (id or slug) to select.
   */
  onCreate?: (name: string) => Promise<string | null>;
  creating?: boolean;
};

/** City selector with a built-in search box for fast picking. */
export function CityPicker({
  cities,
  value,
  onChange,
  valueKey = "slug",
  disabled = false,
  placeholder = "اختر المدينة",
  allLabel,
  className,
  onCreate,
  creating = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  const selected = cities.find((c) => c[valueKey] === value) ?? null;
  const list = useMemo(
    () => filterCitiesByTerm(cities, term).slice(0, 120),
    [cities, term],
  );

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-full border border-border bg-card px-3 text-xs disabled:opacity-60"
      >
        <span className="flex items-center gap-1.5 truncate">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selected ? selected.name : (allLabel ?? placeholder)}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover shadow-raised">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث عن مدينة..."
              aria-label="ابحث عن مدينة"
              className="h-7 w-full bg-transparent text-xs outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {allLabel ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full rounded-lg px-3 py-1.5 text-right text-xs hover:bg-muted"
              >
                {allLabel}
              </button>
            ) : null}
            {list.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                <p>لا توجد مدن مطابقة</p>
                {onCreate && term.trim().length >= 2 ? (
                  <button
                    type="button"
                    disabled={creating}
                    onClick={async () => {
                      const created = await onCreate(term.trim());
                      if (created) {
                        onChange(created);
                        setOpen(false);
                      }
                    }}
                    className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {creating ? "جارٍ الإضافة..." : `إضافة مدينة «${term.trim()}»`}
                  </button>
                ) : null}
              </div>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c[valueKey]);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-right text-xs hover:bg-muted",
                    selected?.id === c.id && "bg-muted font-bold",
                  )}
                >
                  <span>{c.name}</span>
                  {c.is_new_city ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-accent-foreground">
                      مدينة جديدة
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
