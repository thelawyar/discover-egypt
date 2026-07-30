import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Index of the two sitemaps: core pages and paginated result pages. */
export const Route = createFileRoute("/sitemap-index.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        const host = request.headers.get("host") ?? "";
        const base = host ? `${proto}://${host}` : "";

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          `  <sitemap><loc>${base}/sitemap.xml</loc></sitemap>`,
          `  <sitemap><loc>${base}/sitemap-search.xml</loc></sitemap>`,
          `</sitemapindex>`,
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
