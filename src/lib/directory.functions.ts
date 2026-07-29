import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BusinessCardData,
  BusinessDetail,
  Taxonomy,
} from "./directory-types";

type Row = Record<string, unknown>;

function rel(value: unknown, key: string): string | null {
  if (!value) return null;
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as unknown as Row)[key];
  return typeof v === "string" ? v : null;
}

function toCard(row: Row): BusinessCardData {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    address: (row.address as string) ?? null,
    phone: (row.phone as string) ?? null,
    whatsapp: (row.whatsapp as string) ?? null,
    cover_image_url: (row.cover_image_url as string) ?? null,
    products: (row.products as string[]) ?? [],
    is_featured: Boolean(row.is_featured),
    category_name: rel(row.categories, "name"),
    city_name: rel(row.cities, "name"),
    governorate_name: rel(row.governorates, "name"),
  };
}

const CARD_SELECT =
  "id,name,description,address,phone,whatsapp,cover_image_url,products,is_featured," +
  "categories(name),cities(name),governorates(name)";

export const getTaxonomy = createServerFn({ method: "GET" }).handler(
  async (): Promise<Taxonomy> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const [gov, city, cat] = await Promise.all([
      supabase.from("governorates").select("id,name,slug").order("sort_order"),
      supabase
        .from("cities")
        .select("id,name,slug,governorate_id,is_new_city")
        .order("name"),
      supabase.from("categories").select("id,name,slug,icon").order("sort_order"),
    ]);

    return {
      governorates: gov.data ?? [],
      cities: city.data ?? [],
      categories: cat.data ?? [],
    };
  },
);

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  gov: z.string().optional(),
  cat: z.string().optional(),
  page: z.number().optional(),
});

export const searchBusinesses = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{ items: BusinessCardData[]; total: number; page: number }> => {
      const { getPublicClient } = await import("./supabase-public.server");
      const supabase = getPublicClient();

      const perPage = 12;
      const page = Math.max(1, Math.min(200, data.page ?? 1));
      const term = (data.q ?? "").trim().slice(0, 100);

      let query = supabase
        .from("businesses")
        .select(CARD_SELECT, { count: "exact" })
        .eq("status", "approved");

      if (data.city) query = query.eq("city_id", data.city);
      if (data.gov) query = query.eq("governorate_id", data.gov);
      if (data.cat) query = query.eq("category_id", data.cat);

      if (term) {
        const escaped = term.replace(/[%,()]/g, " ");
        const { data: cats } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", `%${escaped}%`);
        const catIds = (cats ?? []).map((c) => c.id);

        const clauses = [`search_text.ilike.%${escaped}%`];
        if (catIds.length) clauses.push(`category_id.in.(${catIds.join(",")})`);
        query = query.or(clauses.join(","));
      }

      const from = (page - 1) * perPage;
      const { data: rows, count } = await query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, from + perPage - 1);

      return {
        items: (rows ?? []).map((r) => toCard(r as unknown as Row)),
        total: count ?? 0,
        page,
      };
    },
  );

export const getBusiness = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }): Promise<BusinessDetail | null> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: row } = await supabase
      .from("businesses")
      .select(
        CARD_SELECT +
          ",email,website,facebook,instagram,latitude,longitude,view_count,cities(slug,name)",
      )
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();

    if (!row) return null;
    const r = row as unknown as Row;

    const [images, hours, reviews] = await Promise.all([
      supabase
        .from("business_images")
        .select("id,url")
        .eq("business_id", data.id)
        .order("sort_order"),
      supabase
        .from("business_hours")
        .select("day_of_week,opens_at,closes_at,is_closed")
        .eq("business_id", data.id)
        .order("day_of_week"),
      supabase
        .from("reviews")
        .select("id,rating,comment,author_name,created_at")
        .eq("business_id", data.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    return {
      ...toCard(r),
      email: (r.email as string) ?? null,
      website: (r.website as string) ?? null,
      facebook: (r.facebook as string) ?? null,
      instagram: (r.instagram as string) ?? null,
      latitude: (r.latitude as number) ?? null,
      longitude: (r.longitude as number) ?? null,
      city_slug: rel(r.cities, "slug"),
      view_count: (r.view_count as number) ?? 0,
      images: images.data ?? [],
      hours: hours.data ?? [],
      reviews: reviews.data ?? [],
    };
  });

export const getCityPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: city } = await supabase
      .from("cities")
      .select("id,name,slug,is_new_city,governorates(name,id)")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!city) return null;

    const { data: rows, count } = await supabase
      .from("businesses")
      .select(CARD_SELECT, { count: "exact" })
      .eq("status", "approved")
      .eq("city_id", city.id)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(24);

    return {
      city: {
        id: city.id,
        name: city.name,
        slug: city.slug,
        governorate_name: rel((city as unknown as Row).governorates, "name"),
      },
      items: (rows ?? []).map((r) => toCard(r as unknown as Row)),
      total: count ?? 0,
    };
  });

export const getHomeStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const [businesses, cities, featured] = await Promise.all([
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase.from("cities").select("id", { count: "exact", head: true }),
      supabase
        .from("businesses")
        .select(CARD_SELECT)
        .eq("status", "approved")
        .eq("is_featured", true)
        .limit(6),
    ]);

    return {
      businessCount: businesses.count ?? 0,
      cityCount: cities.count ?? 0,
      featured: (featured.data ?? []).map((r) => toCard(r as unknown as Row)),
    };
  },
);
