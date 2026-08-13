/**
 * Server-only mappers shared by the portal / events / lists server functions.
 * Kept out of *.functions.ts so those stay thin wrappers (splitting-safe).
 */
import type { BusinessCardData } from "./directory-types";
import type { EventCardData } from "./event-kinds";

type Row = Record<string, unknown>;

export function rel(value: unknown, key: string): string | null {
  if (!value) return null;
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Row)[key];
  return typeof v === "string" ? v : null;
}

function strArr(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export const CARD_SELECT =
  "id,username,name,description,address,phone,whatsapp,cover_image_url,cover_thumb_url,products,is_featured,is_hiring," +
  "price_level,amenities,payment_methods,good_for,vibes,occasions," +
  "categories(name),cities(name),governorates(name,slug)";

export function toCard(row: Row): BusinessCardData {
  return {
    id: row.id as string,
    username: (row.username as string) ?? "",
    name: row.name as string,
    description: (row.description as string) ?? null,
    address: (row.address as string) ?? null,
    phone: (row.phone as string) ?? null,
    whatsapp: (row.whatsapp as string) ?? null,
    cover_image_url: (row.cover_image_url as string) ?? null,
    cover_thumb_url: (row.cover_thumb_url as string) ?? null,
    products: (row.products as string[]) ?? [],
    is_featured: Boolean(row.is_featured),
    is_hiring: Boolean(row.is_hiring),
    price_level: typeof row.price_level === "number" ? row.price_level : null,
    amenities: strArr(row.amenities),
    payment_methods: strArr(row.payment_methods),
    good_for: strArr(row.good_for),
    vibes: strArr(row.vibes),
    occasions: strArr(row.occasions),
    category_name: rel(row.categories, "name"),
    city_name: rel(row.cities, "name"),
    governorate_name: rel(row.governorates, "name"),
    governorate_slug: rel(row.governorates, "slug"),
  };
}

export const EVENT_SELECT =
  "id,kind,title,description,image_url,venue,external_url,price_info,starts_at,ends_at,is_featured," +
  "businesses(id,name,username,cover_image_url),cities(name),governorates(name)";

export function toEvent(row: Row): EventCardData {
  const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  const b = (biz ?? {}) as Row;
  return {
    id: row.id as string,
    kind: (row.kind as string) ?? "event",
    title: row.title as string,
    description: (row.description as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    venue: (row.venue as string) ?? null,
    external_url: (row.external_url as string) ?? null,
    price_info: (row.price_info as string) ?? null,
    starts_at: row.starts_at as string,
    ends_at: (row.ends_at as string) ?? null,
    is_featured: Boolean(row.is_featured),
    business_id: (b.id as string) ?? null,
    business_name: (b.name as string) ?? null,
    business_username: (b.username as string) ?? null,
    business_cover: (b.cover_image_url as string) ?? null,
    city_name: rel(row.cities, "name"),
    governorate_name: rel(row.governorates, "name"),
  };
}

/** ISO bounds (Cairo-ish) for the "when" filter used by /events. */
export function whenRange(when: string): { from: string | null; to: string | null } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (when === "today") return { from: iso(now), to: iso(endOfDay) };
  if (when === "week") {
    const to = new Date(now.getTime() + 7 * 86400000);
    return { from: iso(now), to: iso(to) };
  }
  if (when === "month") {
    const to = new Date(now.getTime() + 30 * 86400000);
    return { from: iso(now), to: iso(to) };
  }
  if (when === "past") return { from: null, to: iso(now) };
  return { from: iso(new Date(now.getTime() - 12 * 3600000)), to: null };
}
