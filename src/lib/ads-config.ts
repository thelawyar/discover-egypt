import type { SiteSettings } from "@/hooks/useSiteSettings";

/** Page types that can use their own AdSense unit. */
export type AdPageType = "search" | "business" | "home";

export const AD_PAGE_LABELS: Record<AdPageType, string> = {
  search: "نتائج البحث",
  business: "صفحة تفاصيل النشاط",
  home: "الصفحة الرئيسية",
};

/** Per-page AdSense unit, falling back to the general slot. */
export function adsenseSlotFor(settings: SiteSettings, pageType: AdPageType) {
  const perPage =
    pageType === "business" ? settings.adsense_slot_business : settings.adsense_slot_search;
  return (perPage?.trim() || settings.adsense_slot?.trim() || "") || null;
}

/**
 * Positions of ads between organic results, e.g. "3,6" places an ad after the
 * 3rd and 6th result. Falls back to a repeating interval when empty.
 */
export function parseAdPositions(raw: string | null | undefined): number[] {
  return Array.from(
    new Set(
      (raw ?? "")
        .split(/[,\s]+/)
        .map((v) => Number.parseInt(v, 10))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ).sort((a, b) => a - b);
}

/** Resolves the slot indexes (1-based result numbers) where an ad should follow. */
export function adSlotIndexes(settings: SiteSettings, total: number): number[] {
  const explicit = parseAdPositions(settings.ad_positions);
  if (explicit.length) return explicit.filter((n) => n <= total);
  const every = Math.max(2, settings.adsense_every || 4);
  const out: number[] = [];
  for (let i = every; i <= total; i += every) out.push(i);
  return out;
}
