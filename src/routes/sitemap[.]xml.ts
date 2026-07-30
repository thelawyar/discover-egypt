import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getSitemapData } from "@/lib/directory.functions";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        const host = request.headers.get("host") ?? "";
        const base = host ? `${proto}://${host}` : "";

        const data = await getSitemapData();

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/search", changefreq: "daily", priority: "0.9" },
          ...data.categories.map((slug) => ({
            path: `/search?cat=${encodeURIComponent(slug)}`,
            changefreq: "weekly" as const,
            priority: "0.6",
          })),
          ...data.governorates.map((slug) => ({
            path: `/search?gov=${encodeURIComponent(slug)}`,
            changefreq: "weekly" as const,
            priority: "0.6",
          })),
          ...data.cities.map((slug) => ({
            path: `/city/${encodeURIComponent(slug)}`,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...data.businesses.map((b) => ({
            path: `/${encodeURIComponent(b.username ?? b.id)}`,
            lastmod: b.updated_at ? new Date(b.updated_at).toISOString() : undefined,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${base}${e.path.replace(/&/g, "&amp;")}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
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
