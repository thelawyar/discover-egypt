/**
 * Server-only data + Markdown helpers used by the agent-facing surfaces
 * (llms.txt, Markdown content negotiation, and the MCP server tools).
 */
import { getPublicClient } from "./supabase-public.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AgentBusiness = {
  id: string;
  username: string | null;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  products: string[];
  category: string | null;
  city: string | null;
  governorate: string | null;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
};

type Row = Record<string, unknown>;

function rel(value: unknown, key: string): string | null {
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Row)[key];
  return typeof v === "string" ? v : null;
}

const SELECT =
  "id,username,name,description,address,phone,whatsapp,website,products,cover_image_url," +
  "latitude,longitude,updated_at,categories(name),cities(name,slug),governorates(name)";

function toBusiness(row: Row): AgentBusiness {
  return {
    id: row.id as string,
    username: (row.username as string) ?? null,
    name: row.name as string,
    description: (row.description as string) ?? null,
    address: (row.address as string) ?? null,
    phone: (row.phone as string) ?? null,
    whatsapp: (row.whatsapp as string) ?? null,
    website: (row.website as string) ?? null,
    products: (row.products as string[]) ?? [],
    category: rel(row.categories, "name"),
    city: rel(row.cities, "name"),
    governorate: rel(row.governorates, "name"),
    cover_image_url: (row.cover_image_url as string) ?? null,
    latitude: (row.latitude as number) ?? null,
    longitude: (row.longitude as number) ?? null,
    updated_at: (row.updated_at as string) ?? null,
  };
}

export async function agentSearchBusinesses(input: {
  query?: string;
  city?: string;
  category?: string;
  limit?: number;
}): Promise<AgentBusiness[]> {
  const supabase = getPublicClient();
  const limit = Math.max(1, Math.min(50, input.limit ?? 10));

  const resolve = async (
    table: "cities" | "categories",
    value: string | undefined,
  ) => {
    if (!value) return null;
    if (UUID_RE.test(value)) return value;
    const { data } = await supabase
      .from(table)
      .select("id")
      .or(`slug.eq.${value},name.eq.${value}`)
      .maybeSingle();
    return data?.id ?? "00000000-0000-0000-0000-000000000000";
  };

  const [cityId, catId] = await Promise.all([
    resolve("cities", input.city),
    resolve("categories", input.category),
  ]);

  let q = supabase
    .from("businesses")
    .select(SELECT)
    .eq("status", "approved")
    .limit(limit);

  if (cityId) q = q.eq("city_id", cityId);
  if (catId) q = q.eq("category_id", catId);

  const term = (input.query ?? "").replace(/[%,()]/g, " ").trim().slice(0, 80);
  if (term.length >= 2) q = q.ilike("search_text", `%${term}%`);

  const { data } = await q.order("is_featured", { ascending: false });
  return (data ?? []).map((r) => toBusiness(r as unknown as Row));
}

export async function agentGetBusiness(
  handle: string,
): Promise<AgentBusiness | null> {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("businesses")
    .select(SELECT)
    .eq(UUID_RE.test(handle) ? "id" : "username", handle.toLowerCase())
    .eq("status", "approved")
    .maybeSingle();
  return data ? toBusiness(data as unknown as Row) : null;
}

export async function agentListTaxonomy() {
  const supabase = getPublicClient();
  const [gov, cities, cats] = await Promise.all([
    supabase.from("governorates").select("name,slug").order("sort_order"),
    supabase
      .from("cities")
      .select("name,slug")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("categories")
      .select("name,slug")
      .eq("status", "approved")
      .order("sort_order"),
  ]);
  return {
    governorates: gov.data ?? [],
    cities: cities.data ?? [],
    categories: cats.data ?? [],
  };
}

/* ------------------------------- Markdown -------------------------------- */

export function businessMarkdown(b: AgentBusiness, origin: string): string {
  const url = `${origin}/${b.username ?? b.id}`;
  const lines = [
    `# ${b.name}`,
    "",
    b.description ?? "",
    "",
    "## معلومات النشاط",
    `- التصنيف: ${b.category ?? "غير محدد"}`,
    `- المدينة: ${b.city ?? "غير محدد"}`,
    `- المحافظة: ${b.governorate ?? "غير محدد"}`,
    b.address ? `- العنوان: ${b.address}` : null,
    b.phone ? `- الهاتف: ${b.phone}` : null,
    b.whatsapp ? `- واتساب: ${b.whatsapp}` : null,
    b.website ? `- الموقع: ${b.website}` : null,
    b.latitude && b.longitude
      ? `- الإحداثيات: ${b.latitude}, ${b.longitude}`
      : null,
    `- الرابط: ${url}`,
    b.products.length ? "" : null,
    b.products.length ? "## المنتجات والخدمات" : null,
    ...b.products.map((p) => `- ${p}`),
  ].filter((l) => l !== null);
  return lines.join("\n") + "\n";
}

export function searchMarkdown(
  items: AgentBusiness[],
  origin: string,
  title: string,
): string {
  const head = [`# ${title}`, "", `عدد النتائج: ${items.length}`, ""];
  const body = items.map((b) =>
    [
      `## ${b.name}`,
      `- التصنيف: ${b.category ?? "غير محدد"} — المدينة: ${b.city ?? "غير محدد"}`,
      b.phone ? `- الهاتف: ${b.phone}` : null,
      b.description ? `- ${b.description.slice(0, 220)}` : null,
      `- الرابط: ${origin}/${b.username ?? b.id}`,
      "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [...head, ...body].join("\n");
}
