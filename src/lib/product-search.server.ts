import { getPublicClient } from "./supabase-public.server";
import { arNorm } from "./ar-normalize";
import { productSearchPrice } from "./product-search";
import type { SearchFilters } from "./directory.functions";
import type { ProductSearchResult } from "./directory-types";

export async function findPublicProducts(input: {
  term: string; product?: string; page: number; sort?: string;
  cityId: string | null; govId: string | null; catId: string | null;
  filters?: SearchFilters; openIds?: string[] | null;
}): Promise<{ items: ProductSearchResult[]; total: number }> {
  const supabase = getPublicClient();
  const tokens = arNorm(input.term).replace(/[%,(){}"'\\]/g, " ").split(/\s+/).filter((v) => v.length >= 2).slice(0, 5);
  const build = (loose: boolean) => {
    let query = supabase.from("store_products")
      .select("id,name,description,image_url,business_id,store_variants(price,original_price,stock),businesses!inner(id,name,username,whatsapp,status,city_ids,governorate_ids,category_id,search_norm,price_level,amenities,payment_methods,good_for,vibes,occasions,cities(name),governorates(name),store_settings!inner(is_enabled))", { count: "exact" })
      .eq("is_active", true).eq("businesses.status", "approved")
      .eq("businesses.store_settings.is_enabled", true)
      .not("businesses.whatsapp", "is", null).neq("businesses.whatsapp", "");
    if (input.cityId) query = query.overlaps("businesses.city_ids", [input.cityId]);
    if (input.govId) query = query.overlaps("businesses.governorate_ids", [input.govId]);
    if (input.catId) query = query.eq("businesses.category_id", input.catId);
    const f = input.filters;
    if (f) {
      for (const key of ["amenities", "payment_methods", "good_for", "vibes", "occasions"] as const) {
        if (f[key].length) query = query.contains(`businesses.${key}`, f[key]);
      }
      if (f.price_max) query = query.lte("businesses.price_level", f.price_max);
      if (f.open_now) {
        const ids = input.openIds?.slice(0, 800) ?? [];
        if (ids.length) query = query.or(`id.in.(${ids.join(",")}),amenities.cs.{open_24h}`, { referencedTable: "businesses" });
        else query = query.contains("businesses.amenities", ["open_24h"]);
      }
    }
    const product = arNorm(input.product ?? "").replace(/[%,(){}"'\\]/g, " ").trim();
    if (product.length >= 2) query = query.ilike("search_norm", `%${product}%`);
    if (loose) query = query.or(tokens.map((t) => `search_norm.ilike.%${t}%`).join(","));
    else for (const token of tokens) query = query.ilike("search_norm", `%${token}%`);
    query = query.order("created_at", { ascending: false });
    const offset = (input.page - 1) * 12;
    return query.range(offset, offset + 11);
  };
  let result = await build(false);
  if (result.error) throw new Error("تعذر البحث عن المنتجات");
  if (!result.count && tokens.length > 1) result = await build(true);
  if (result.error) throw new Error("تعذر البحث عن المنتجات");
  const items: ProductSearchResult[] = (result.data ?? []).map((p) => ({
    id: p.id, name: p.name, description: p.description, image_url: p.image_url,
    business_id: p.business_id, business_name: p.businesses.name, username: p.businesses.username ?? "",
    city_name: p.businesses.cities?.name ?? null, governorate_name: p.businesses.governorates?.name ?? null,
    ...productSearchPrice(p.store_variants),
  }));
  return { items, total: result.count ?? 0 };
}