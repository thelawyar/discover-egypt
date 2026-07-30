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
    category_name: rel(row.categories, "name"),
    city_name: rel(row.cities, "name"),
    governorate_name: rel(row.governorates, "name"),
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_MATCH = "00000000-0000-0000-0000-000000000000";

const CARD_SELECT =
  "id,username,name,description,address,phone,whatsapp,cover_image_url,cover_thumb_url,products,is_featured," +
  "categories(name),cities(name),governorates(name)";

export const getTaxonomy = createServerFn({ method: "GET" }).handler(
  async (): Promise<Taxonomy> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const [gov, city, cat] = await Promise.all([
      supabase.from("governorates").select("id,name,slug").order("sort_order"),
      supabase
        .from("cities")
        .select("id,name,slug,governorate_id,is_new_city,is_active")
        .eq("is_active", true)
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
  prod: z.string().optional(),
  sort: z.enum(["best", "newest", "popular"]).optional(),
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

      // Filters accept either a UUID or a SEO-friendly slug.
      const resolve = async (
        table: "cities" | "governorates" | "categories",
        value: string | undefined,
      ): Promise<string | null> => {
        if (!value) return null;
        if (UUID_RE.test(value)) return value;
        const { data: row } = await supabase
          .from(table)
          .select("id")
          .eq("slug", value)
          .maybeSingle();
        return row?.id ?? NO_MATCH;
      };

      const [cityId, govId, catId] = await Promise.all([
        resolve("cities", data.city),
        resolve("governorates", data.gov),
        resolve("categories", data.cat),
      ]);

      // Split the query into words so "عيادة اسنان المنصورة" matches a business
      // whose words are spread across name / description / products / city.
      const tokens = term
        .replace(/[%,()]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .slice(0, 5);

      const clausesPerToken = await Promise.all(
        tokens.map(async (token) => {
          const [cats, cities, govs] = await Promise.all([
            supabase.from("categories").select("id").ilike("name", `%${token}%`),
            supabase.from("cities").select("id").ilike("name", `%${token}%`),
            supabase.from("governorates").select("id").ilike("name", `%${token}%`),
          ]);
          const parts = [`search_text.ilike.%${token}%`];
          const catList = (cats.data ?? []).map((c) => c.id);
          const cityList = (cities.data ?? []).map((c) => c.id);
          const govList = (govs.data ?? []).map((g) => g.id);
          if (catList.length) parts.push(`category_id.in.(${catList.join(",")})`);
          if (cityList.length) parts.push(`city_id.in.(${cityList.join(",")})`);
          if (govList.length)
            parts.push(`governorate_id.in.(${govList.join(",")})`);
          return parts.join(",");
        }),
      );

      const from = (page - 1) * perPage;
      // Product keyword: matches the products array or any indexed text.
      const product = (data.prod ?? "")
        .replace(/[%,(){}"']/g, " ")
        .trim()
        .slice(0, 40);
      const sort = data.sort ?? "best";

      const build = (mode: "all" | "any") => {
        let query = supabase
          .from("businesses")
          .select(CARD_SELECT, { count: "exact" })
          .eq("status", "approved");

        if (cityId) query = query.eq("city_id", cityId);
        if (govId) query = query.eq("governorate_id", govId);
        if (catId) query = query.eq("category_id", catId);
        if (product.length >= 2)
          query = query.or(
            `products.cs.{"${product}"},search_text.ilike.%${product}%`,
          );

        if (clausesPerToken.length) {
          if (mode === "all") {
            // Chained .or() calls are AND-ed together: every word must match something.
            for (const clause of clausesPerToken) query = query.or(clause);
          } else {
            query = query.or(clausesPerToken.join(","));
          }
        }

        if (sort === "newest") {
          query = query.order("created_at", { ascending: false });
        } else if (sort === "popular") {
          query = query
            .order("view_count", { ascending: false })
            .order("created_at", { ascending: false });
        } else {
          query = query
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false });
        }

        return query.range(from, from + perPage - 1);
      };


      let { data: rows, count } = await build("all");

      // Nothing matched every word — fall back to "any word" so the user still gets results.
      if (!rows?.length && clausesPerToken.length > 1) {
        const loose = await build("any");
        rows = loose.data;
        count = loose.count;
      }

      // Log the search so the admin dashboard can surface popular / empty terms.
      if (term.length >= 2 && page === 1) {
        await supabase.rpc("log_search_query", {
          _term: term,
          _results: count ?? 0,
          _city: data.city ?? undefined,
          _category: data.cat ?? undefined,
        });
      }

      return {
        items: (rows ?? []).map((r) => toCard(r as unknown as Row)),
        total: count ?? 0,
        page,
      };
    },
  );

/** Fast autocomplete: business names plus matching categories and cities. */
export const suggestSearch = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ q: z.string().max(100) }).parse(data),
  )
  .handler(async ({ data }) => {
    const term = data.q.trim().replace(/[%,()]/g, " ").slice(0, 60);
    if (term.length < 2)
      return { businesses: [], categories: [], cities: [] };

    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const [biz, cats, cities] = await Promise.all([
      supabase
        .from("businesses")
        .select("id,username,name,cover_image_url,categories(name),cities(name)")
        .eq("status", "approved")
        .ilike("search_text", `%${term}%`)
        .order("is_featured", { ascending: false })
        .limit(6),
      supabase
        .from("categories")
        .select("name,slug")
        .eq("status", "approved")
        .ilike("name", `%${term}%`)
        .limit(4),
      supabase.from("cities").select("name,slug").ilike("name", `%${term}%`).limit(4),
    ]);

    return {
      businesses: (biz.data ?? []).map((r) => {
        const row = r as unknown as Row;
        return {
          id: row.id as string,
          username: (row.username as string) ?? "",
          name: row.name as string,
          cover_image_url: (row.cover_image_url as string) ?? null,
          category_name: rel(row.categories, "name"),
          city_name: rel(row.cities, "name"),
        };
      }),
      categories: cats.data ?? [],
      cities: cities.data ?? [],
    };
  });


export const getBusiness = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }): Promise<BusinessDetail | null> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: row } = await supabase
      .from("businesses")
      .select(
        CARD_SELECT.replace("cities(name)", "cities(name,slug)") +
          ",email,website,facebook,instagram,latitude,longitude,view_count," +
          "logo_url,theme_primary,theme_bg,theme_style,theme_font,theme_button," +
          "theme_contrast,updated_at",
      )
      .eq(UUID_RE.test(data.id) ? "id" : "username", data.id.toLowerCase())
      .eq("status", "approved")
      .maybeSingle();

    if (!row) return null;
    const r = row as unknown as Row;
    const businessId = r.id as string;

    const [images, hours, reviews] = await Promise.all([
      supabase
        .from("business_images")
        .select("id,url")
        .eq("business_id", businessId)
        .order("sort_order"),
      supabase
        .from("business_hours")
        .select("day_of_week,opens_at,closes_at,is_closed")
        .eq("business_id", businessId)
        .order("day_of_week"),
      supabase
        .from("reviews")
        .select("id,rating,comment,author_name,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    return {
      ...toCard(r),
      logo_url: (r.logo_url as string) ?? null,
      theme_primary: (r.theme_primary as string) ?? null,
      theme_bg: (r.theme_bg as string) ?? null,
      theme_style: (r.theme_style as string) ?? null,
      theme_font: (r.theme_font as string) ?? null,
      theme_button: (r.theme_button as string) ?? null,
      theme_contrast: Boolean(r.theme_contrast),
      updated_at: (r.updated_at as string) ?? null,
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

export const CITY_PER_PAGE = 24;

export const getCityPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string(), page: z.number().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: city } = await supabase
      .from("cities")
      .select("id,name,slug,is_new_city,governorates(name,id,slug)")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!city) return null;

    const perPage = 24;
    const page = Math.max(1, Math.min(200, data.page ?? 1));
    const from = (page - 1) * perPage;

    const { data: rows, count } = await supabase
      .from("businesses")
      .select(CARD_SELECT, { count: "exact" })
      .eq("status", "approved")
      .eq("city_id", city.id)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);

    return {
      city: {
        id: city.id,
        name: city.name,
        slug: city.slug,
        governorate_name: rel((city as unknown as Row).governorates, "name"),
        governorate_slug: rel((city as unknown as Row).governorates, "slug"),
      },
      items: (rows ?? []).map((r) => toCard(r as unknown as Row)),
      total: count ?? 0,
      page,
      perPage,
    };
  });

/** Data for /sitemap.xml: indexable cities, categories and approved businesses. */
export const getSitemapData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const [cities, categories, businesses] = await Promise.all([
      supabase.from("cities").select("slug").order("name"),
      supabase.from("categories").select("slug").order("sort_order"),
      supabase
        .from("businesses")
        .select("id,username,updated_at")
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(5000),
    ]);

    return {
      cities: (cities.data ?? []).map((c) => c.slug),
      categories: (categories.data ?? []).map((c) => c.slug),
      businesses: (businesses.data ?? []).map((b) => ({
        id: b.id,
        username: b.username,
        updated_at: b.updated_at,
      })),
    };
  },
);

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

export const HOME_PER_PAGE = 12;

/** Paginated home feed with optional category / governorate chip filters. */
export const getHomeFeed = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        page: z.number().optional(),
        cat: z.string().max(64).optional(),
        gov: z.string().max(64).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const perPage = 12;
    const page = Math.max(1, Math.min(100, data.page ?? 1));
    const from = (page - 1) * perPage;

    let query = supabase
      .from("businesses")
      .select(CARD_SELECT, { count: "exact" })
      .eq("status", "approved");

    if (data.cat) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", data.cat)
        .maybeSingle();
      query = query.eq("category_id", cat?.id ?? NO_MATCH);
    }

    if (data.gov) {
      const govId = UUID_RE.test(data.gov)
        ? data.gov
        : ((
            await supabase
              .from("governorates")
              .select("id")
              .eq("slug", data.gov)
              .maybeSingle()
          ).data?.id ?? NO_MATCH);
      query = query.eq("governorate_id", govId);
    }

    const { data: rows, count } = await query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);

    return {
      items: (rows ?? []).map((r) => toCard(r as unknown as Row)),
      total: count ?? 0,
      page,
      perPage,
    };
  });



/** Old handle -> current handle, so previous /username links keep working (301). */
export const resolveLegacyHandle = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ username: z.string().max(64) }).parse(data),
  )
  .handler(async ({ data }): Promise<string | null> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: row } = await supabase
      .from("business_username_history")
      .select("business_id")
      .eq("username", data.username.toLowerCase())
      .maybeSingle();

    if (!row) return null;

    const { data: biz } = await supabase
      .from("businesses")
      .select("username")
      .eq("id", row.business_id)
      .eq("status", "approved")
      .maybeSingle();

    return biz?.username ?? null;
  });
