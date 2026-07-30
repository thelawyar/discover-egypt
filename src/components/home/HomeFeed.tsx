import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { getHomeFeed } from "@/lib/directory.functions";
import { BusinessCard } from "@/components/BusinessCard";
import { cn } from "@/lib/utils";
import type { Category, Governorate } from "@/lib/directory-types";

type Props = {
  categories: Category[];
  governorates: Governorate[];
};

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-32 w-full bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary-soft text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function HomeFeed({ categories, governorates }: Props) {
  // Draft chips (user taps) vs applied filters (query runs) — fewer refetches on mobile.
  const [draftCat, setDraftCat] = useState("");
  const [draftGov, setDraftGov] = useState("");
  const [cat, setCat] = useState("");
  const [gov, setGov] = useState("");
  const [openFilters, setOpenFilters] = useState(false);

  const dirty = draftCat !== cat || draftGov !== gov;

  const feed = useInfiniteQuery({
    queryKey: ["home-feed", cat, gov],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getHomeFeed({ data: { page: pageParam as number, cat, gov } }),
    getNextPageParam: (last) =>
      last.page * last.perPage < last.total ? last.page + 1 : undefined,
    staleTime: 1000 * 60 * 5,
  });

  const items = useMemo(
    () => feed.data?.pages.flatMap((p) => p.items) ?? [],
    [feed.data],
  );
  const total = feed.data?.pages[0]?.total ?? 0;

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage)
          feed.fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed]);

  const activeCount = (cat ? 1 : 0) + (gov ? 1 : 0);

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl sm:mt-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate text-base font-bold sm:text-lg">
          أنشطة في الدليل
          {total ? (
            <span className="mr-2 text-xs font-normal text-muted-foreground">
              {total.toLocaleString("ar-EG")} نشاط
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => setOpenFilters((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
        >
          <SlidersHorizontal className="size-3.5" />
          تصفية
          {activeCount ? (
            <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {openFilters ? (
        <div className="mt-3 rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">التصنيف</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            <Chip active={!draftCat} onClick={() => setDraftCat("")}>
              الكل
            </Chip>
            {categories.slice(0, 16).map((c) => (
              <Chip
                key={c.id}
                active={draftCat === c.slug}
                onClick={() => setDraftCat(draftCat === c.slug ? "" : c.slug)}
              >
                {c.name}
              </Chip>
            ))}
          </div>

          <p className="mt-3 mb-2 text-[11px] font-bold text-muted-foreground">
            المحافظة
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            <Chip active={!draftGov} onClick={() => setDraftGov("")}>
              الكل
            </Chip>
            {governorates.map((g) => (
              <Chip
                key={g.id}
                active={draftGov === g.id}
                onClick={() => setDraftGov(draftGov === g.id ? "" : g.id)}
              >
                {g.name}
              </Chip>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setCat(draftCat);
                setGov(draftGov);
                setOpenFilters(false);
              }}
              className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              تطبيق التصفية
            </button>
            {activeCount || draftCat || draftGov ? (
              <button
                type="button"
                onClick={() => {
                  setDraftCat("");
                  setDraftGov("");
                  setCat("");
                  setGov("");
                }}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground"
              >
                <X className="size-3.5" /> مسح
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <BusinessCard key={b.id} item={b} />
        ))}
        {feed.isLoading || feed.isFetchingNextPage
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)
          : null}
      </div>

      {!feed.isLoading && !items.length ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          لا توجد أنشطة مطابقة لهذه التصفية.
        </p>
      ) : null}

      <div ref={sentinel} className="h-8" />

      {feed.hasNextPage ? (
        <button
          type="button"
          onClick={() => feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          className="mx-auto block rounded-full border border-border px-5 py-2 text-xs font-semibold text-primary"
        >
          {feed.isFetchingNextPage ? "جارٍ التحميل..." : "عرض المزيد"}
        </button>
      ) : null}
    </section>
  );
}
