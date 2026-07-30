import { createFileRoute } from "@tanstack/react-router";
import {
  agentGetBusiness,
  agentListTaxonomy,
  agentSearchBusinesses,
  businessMarkdown,
  searchMarkdown,
} from "@/lib/agent-data.server";

const MD_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=600",
  "Access-Control-Allow-Origin": "*",
  Vary: "Accept",
};

/**
 * Markdown representation of any public page. Used directly and through
 * content negotiation (`Accept: text/markdown` or a `.md` suffix).
 */
export const Route = createFileRoute("/api/public/md")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Accept,Content-Type",
          },
        }),
      GET: async ({ request }) => {
        const reqUrl = new URL(request.url);
        const proto = request.headers.get("x-forwarded-proto") ?? reqUrl.protocol.replace(":", "");
        const host = request.headers.get("host") ?? reqUrl.host;
        const origin = `${proto}://${host}`;

        const raw = reqUrl.searchParams.get("path") ?? "/";
        const target = new URL(raw, origin);
        const path = target.pathname.replace(/\.md$/, "") || "/";
        const sp = target.searchParams;

        const md = await renderPath(path, sp, origin);
        return new Response(md, { headers: MD_HEADERS });
      },
    },
  },
});

async function renderPath(
  path: string,
  sp: URLSearchParams,
  origin: string,
): Promise<string> {
  if (path === "/") {
    const tax = await agentListTaxonomy();
    return [
      "# اكتشف مدينتك — Discover Your Town",
      "",
      "> دليل تجاري شامل للمدن المصرية: ابحث عن العيادات، المحلات، المصانع، المدارس والخدمات في مدينتك.",
      "",
      "## كيف تبحث",
      `- البحث: ${origin}/search?q=كلمة+البحث`,
      `- حسب المدينة: ${origin}/city/{city-slug}`,
      `- صفحة نشاط: ${origin}/{username}`,
      "",
      `## التصنيفات (${tax.categories.length})`,
      ...tax.categories.map((c) => `- [${c.name}](${origin}/search?cat=${c.slug})`),
      "",
      `## المدن (${tax.cities.length})`,
      ...tax.cities.slice(0, 120).map((c) => `- [${c.name}](${origin}/city/${c.slug})`),
      "",
    ].join("\n");
  }

  if (path === "/search") {
    const items = await agentSearchBusinesses({
      query: sp.get("q") ?? undefined,
      city: sp.get("city") ?? undefined,
      category: sp.get("cat") ?? undefined,
      limit: 25,
    });
    return searchMarkdown(
      items,
      origin,
      `نتائج البحث${sp.get("q") ? `: ${sp.get("q")}` : ""}`,
    );
  }

  if (path.startsWith("/city/")) {
    const slug = decodeURIComponent(path.slice("/city/".length));
    const items = await agentSearchBusinesses({ city: slug, limit: 25 });
    return searchMarkdown(items, origin, `أنشطة في ${slug}`);
  }

  const handle = decodeURIComponent(path.replace(/^\/(business\/)?/, ""));
  if (handle) {
    const business = await agentGetBusiness(handle);
    if (business) return businessMarkdown(business, origin);
  }

  return `# صفحة غير موجودة\n\nلا يوجد محتوى Markdown للمسار ${path}.\nابدأ من ${origin}/llms.txt\n`;
}
