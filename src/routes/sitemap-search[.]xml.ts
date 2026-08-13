import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { CANONICAL_ORIGIN } from "@/lib/seo-text";
import { getSearchFacetCounts } from "@/lib/directory.functions";

/** Same page size the /search loader uses. */
const PER_PAGE = 12;
/** Safety cap so a huge facet can't explode the sitemap. */
const MAX_PAGES = 50;

interface Entry {
  path: string;
  priority: string;
}

function pagesFor(total: number, perPage: number): number {
  return Math.min(MAX_PAGES, Math.max(1, Math.ceil(total / perPage)));
}

/** Emits pages 2..N only — page 1 already lives in /sitemap.xml. */
function paginate(
  base: string,
  total: number,
  priority: string,
  perPage = PER_PAGE,
): Entry[] {
  const out: Entry[] = [];
  const sep = base.includes("?") ? "&" : "?";
  for (let p = 2; p <= pagesFor(total, perPage); p++) {
    out.push({ path: `${base}${sep}page=${p}`, priority });
  }
  return out;
}

export const Route = createFileRoute("/sitemap-search.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = CANONICAL_ORIGIN;

        const data = await getSearchFacetCounts();

        const entries: Entry[] = [
          ...paginate("/search", data.total, "0.5"),
          ...data.categories.flatMap((c) =>
            paginate(`/search?cat=${encodeURIComponent(c.slug)}`, c.count, "0.5"),
          ),
          ...data.governorates.flatMap((g) =>
            paginate(`/search?gov=${encodeURIComponent(g.slug)}`, g.count, "0.5"),
          ),
          ...data.cities.flatMap((c) =>
            paginate(`/search?city=${encodeURIComponent(c.slug)}`, c.count, "0.5"),
          ),
          // /city/$slug lists 24 per page.
          ...data.cities.flatMap((c) =>
            paginate(`/city/${encodeURIComponent(c.slug)}`, c.count, "0.6", 24),
          ),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${base}${e.path.replace(/&/g, "&amp;")}</loc>`,
            `    <changefreq>weekly</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ].join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
