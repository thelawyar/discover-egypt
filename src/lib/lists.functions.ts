import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BusinessCardData } from "./directory-types";

export type PublicList = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  city_name: string | null;
  item_count: number;
  updated_at: string;
};

export const listPublicLists = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ city: z.string().max(64).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<PublicList[]> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const { rel } = await import("./feed.server");
    const supabase = getPublicClient();

    let query = supabase
      .from("lists")
      .select("id,slug,title,description,cover_image_url,updated_at,cities(name,slug),list_items(count)")
      .eq("is_public", true);

    if (data.city) {
      const { data: city } = await supabase
        .from("cities")
        .select("id")
        .eq("slug", data.city)
        .maybeSingle();
      query = query.eq("city_id", city?.id ?? "00000000-0000-0000-0000-000000000000");
    }

    const { data: rows } = await query
      .order("updated_at", { ascending: false })
      .limit(60);

    return (rows ?? []).map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const counts = row.list_items as { count: number }[] | undefined;
      return {
        id: row.id as string,
        slug: row.slug as string,
        title: row.title as string,
        description: (row.description as string) ?? null,
        cover_image_url: (row.cover_image_url as string) ?? null,
        city_name: rel(row.cities, "name"),
        item_count: counts?.[0]?.count ?? 0,
        updated_at: (row.updated_at as string) ?? "",
      };
    });
  });

export const getListBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().max(80) }).parse(data))
  .handler(
    async ({
      data,
    }): Promise<
      | (PublicList & { items: { note: string | null; business: BusinessCardData }[] })
      | null
    > => {
      const { getPublicClient } = await import("./supabase-public.server");
      const { CARD_SELECT, toCard, rel } = await import("./feed.server");
      const supabase = getPublicClient();

      const { data: row } = await supabase
        .from("lists")
        .select("id,slug,title,description,cover_image_url,updated_at,cities(name,slug)")
        .eq("slug", data.slug.toLowerCase())
        .eq("is_public", true)
        .maybeSingle();

      if (!row) return null;
      const list = row as unknown as Record<string, unknown>;

      const { data: items } = await supabase
        .from("list_items")
        .select(`note,sort_order,businesses(${CARD_SELECT})`)
        .eq("list_id", list.id as string)
        .order("sort_order");

      type ListEntry = { note: string | null; business: BusinessCardData };
      const mapped = (items ?? [])
        .map((i): ListEntry | null => {
          const it = i as unknown as Record<string, unknown>;
          const biz = Array.isArray(it.businesses) ? it.businesses[0] : it.businesses;
          if (!biz) return null;
          return {
            note: (it.note as string) ?? null,
            business: toCard(biz as Record<string, unknown>),
          };
        })
        .filter((x): x is ListEntry => x !== null);

      return {
        id: list.id as string,
        slug: list.slug as string,
        title: list.title as string,
        description: (list.description as string) ?? null,
        cover_image_url: (list.cover_image_url as string) ?? null,
        city_name: rel(list.cities, "name"),
        item_count: mapped.length,
        updated_at: (list.updated_at as string) ?? "",
        items: mapped,
      };
    },
  );
