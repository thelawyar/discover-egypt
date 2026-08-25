import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BusinessCardData } from "./directory-types";
import type { EventCardData } from "./event-kinds";

export type CityPortal = {
  city: {
    id: string;
    name: string;
    slug: string;
    governorate_name: string | null;
    governorate_slug: string | null;
  };
  total: number;
  top: BusinessCardData[];
  latest: BusinessCardData[];
  kids: BusinessCardData[];
  nearby: (BusinessCardData & { latitude: number | null; longitude: number | null })[];
  offers: EventCardData[];
  events: EventCardData[];
  categories: { name: string; slug: string; count: number }[];
};

/** Everything the city gateway page shows, scoped to one city. */
export const getCityPortal = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().max(80) }).parse(data))
  .handler(async ({ data }): Promise<CityPortal | null> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const { CARD_SELECT, EVENT_SELECT, toCard, toEvent, rel } = await import(
      "./feed.server"
    );
    const supabase = getPublicClient();

    const { data: cityRow } = await supabase
      .from("cities")
      .select("id,name,slug,governorates(name,slug)")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!cityRow) return null;
    const city = cityRow as unknown as Record<string, unknown>;
    const cityId = city.id as string;

    const base = () =>
      supabase
        .from("businesses")
        .select(CARD_SELECT)
        .eq("status", "approved")
        .overlaps("city_ids", [cityId]);

    const nowIso = new Date().toISOString();
    const soon = new Date(Date.now() + 30 * 86400000).toISOString();

    const [count, top, latest, kids, nearby, offers, events, cats] = await Promise.all([
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .overlaps("city_ids", [cityId]),
      base()
        .order("is_featured", { ascending: false })
        .order("view_count", { ascending: false })
        .limit(6),
      base().order("created_at", { ascending: false }).limit(6),
      base().overlaps("good_for", ["kids", "families"]).limit(6),
      supabase
        .from("businesses")
        .select(`${CARD_SELECT},latitude,longitude`)
        .eq("status", "approved")
        .overlaps("city_ids", [cityId])
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(40),
      supabase
        .from("business_events")
        .select(EVENT_SELECT)
        .eq("is_published", true)
        .eq("city_id", cityId)
        .eq("kind", "offer")
        .lte("starts_at", soon)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("starts_at")
        .limit(6),
      supabase
        .from("business_events")
        .select(EVENT_SELECT)
        .eq("is_published", true)
        .eq("city_id", cityId)
        .neq("kind", "offer")
        .gte("starts_at", new Date(Date.now() - 12 * 3600000).toISOString())
        .order("starts_at")
        .limit(6),
      supabase
        .from("businesses")
        .select("categories(name,slug)")
        .eq("status", "approved")
        .overlaps("city_ids", [cityId])
        .limit(2000),
    ]);

    const counts = new Map<string, { name: string; slug: string; count: number }>();
    for (const r of cats.data ?? []) {
      const row = r as unknown as Record<string, unknown>;
      const name = rel(row.categories, "name");
      const slug = rel(row.categories, "slug");
      if (!name || !slug) continue;
      const prev = counts.get(slug);
      counts.set(slug, { name, slug, count: (prev?.count ?? 0) + 1 });
    }

    const cards = (rows: unknown[] | null) =>
      (rows ?? []).map((r) => toCard(r as Record<string, unknown>));

    return {
      city: {
        id: cityId,
        name: city.name as string,
        slug: city.slug as string,
        governorate_name: rel(city.governorates, "name"),
        governorate_slug: rel(city.governorates, "slug"),
      },
      total: count.count ?? 0,
      top: cards(top.data),
      latest: cards(latest.data),
      kids: cards(kids.data),
      nearby: (nearby.data ?? []).map((r) => {
        const row = r as unknown as Record<string, unknown>;
        return {
          ...toCard(row),
          latitude: (row.latitude as number) ?? null,
          longitude: (row.longitude as number) ?? null,
        };
      }),
      offers: (offers.data ?? []).map((r) => toEvent(r as unknown as Record<string, unknown>)),
      events: (events.data ?? []).map((r) => toEvent(r as unknown as Record<string, unknown>)),
      categories: Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  });

const discoverSchema = z.object({
  city: z.string().max(64).optional(),
  gov: z.string().max(64).optional(),
  cat: z.string().max(64).optional(),
  good: z.string().max(80).optional(),
  vibe: z.string().max(80).optional(),
  price: z.number().optional(),
  seed: z.number().optional(),
});

/** 🎲 Random picks matching the visitor's location + light preferences. */
export const discoverRandom = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => discoverSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<BusinessCardData[]> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const { CARD_SELECT, toCard } = await import("./feed.server");
    const supabase = getPublicClient();

    const resolve = async (table: "cities" | "governorates" | "categories", slug?: string) => {
      if (!slug) return null;
      const { data: row } = await supabase
        .from(table)
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      return row?.id ?? null;
    };

    const attrs = (value: string | undefined) =>
      (value ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter((v) => /^[a-z0-9_]{2,24}$/.test(v))
        .slice(0, 4);

    const run = async (strict: boolean) => {
      let query = supabase
        .from("businesses")
        .select(CARD_SELECT)
        .eq("status", "approved");

      const [cityId, govId, catId] = await Promise.all([
        resolve("cities", data.city),
        resolve("governorates", data.gov),
        resolve("categories", data.cat),
      ]);

      if (cityId) query = query.overlaps("city_ids", [cityId]);
      else if (govId) query = query.overlaps("governorate_ids", [govId]);

      if (strict) {
        if (catId) query = query.eq("category_id", catId);
        const good = attrs(data.good);
        const vibe = attrs(data.vibe);
        if (good.length) query = query.overlaps("good_for", good);
        if (vibe.length) query = query.overlaps("vibes", vibe);
        if (data.price) query = query.lte("price_level", Math.round(data.price));
      }

      const { data: rows } = await query.limit(120);
      return rows ?? [];
    };

    let pool = await run(true);
    if (pool.length < 3) pool = await run(false);

    // Deterministic shuffle from the client-provided seed so SSR matches hydration.
    let seed = Math.abs(Math.floor(data.seed ?? Date.now())) % 2147483647 || 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, 6).map((r) => toCard(r as unknown as Record<string, unknown>));
  });
