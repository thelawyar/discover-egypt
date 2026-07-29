import { createServerFn } from "@tanstack/react-start";

export type SeoIssue = {
  id: string;
  name: string;
  problems: string[];
};

export type SeoStatus = {
  sitemapUrls: number;
  approvedBusinesses: number;
  pendingBusinesses: number;
  cities: number;
  categories: number;
  lastBusinessUpdate: string | null;
  newLast7Days: number;
  missingDescription: number;
  missingImage: number;
  missingLocation: number;
  missingContact: number;
  issues: SeoIssue[];
};

/** Aggregated SEO health used by the admin dashboard. */
export const getSeoStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<SeoStatus> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [approved, cities, categories, recent, rows] = await Promise.all([
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase.from("cities").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("created_at", weekAgo),
      supabase
        .from("businesses")
        .select(
          "id,name,description,cover_image_url,city_id,phone,whatsapp,address,updated_at",
        )
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(2000),
    ]);

    const list = rows.data ?? [];
    const issues: SeoIssue[] = [];
    let missingDescription = 0;
    let missingImage = 0;
    let missingLocation = 0;
    let missingContact = 0;

    for (const b of list) {
      const problems: string[] = [];
      if (!b.description || b.description.trim().length < 50) {
        missingDescription++;
        problems.push("وصف قصير أو غير موجود (يقل عن 50 حرفاً)");
      }
      if (!b.cover_image_url) {
        missingImage++;
        problems.push("لا توجد صورة غلاف — يُستخدم og:image الافتراضي");
      }
      if (!b.city_id || !b.address) {
        missingLocation++;
        problems.push("بيانات العنوان/المدينة ناقصة في PostalAddress");
      }
      if (!b.phone && !b.whatsapp) {
        missingContact++;
        problems.push("لا يوجد رقم تواصل في بيانات LocalBusiness");
      }
      if (problems.length) issues.push({ id: b.id, name: b.name, problems });
    }

    const [pending] = await Promise.all([
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    const cityCount = cities.count ?? 0;
    const catCount = categories.count ?? 0;
    const approvedCount = approved.count ?? 0;

    return {
      sitemapUrls: 1 + cityCount + catCount + approvedCount,
      approvedBusinesses: approvedCount,
      pendingBusinesses: pending.count ?? 0,
      cities: cityCount,
      categories: catCount,
      lastBusinessUpdate: list[0]?.updated_at ?? null,
      newLast7Days: recent.count ?? 0,
      missingDescription,
      missingImage,
      missingLocation,
      missingContact,
      issues: issues.slice(0, 30),
    };
  },
);
