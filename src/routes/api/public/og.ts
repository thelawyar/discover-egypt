import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildOgSvg, type OgCard, type OgKind } from "@/lib/og-card";

const KINDS: OgKind[] = ["business", "city", "search", "site"];

/** Downloads a cover photo and inlines it as a data URI (best effort, size-capped). */
async function inlinePhoto(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    // resvg can rasterize PNG/JPEG only — WebP would break the whole card.
    if (!/^image\/(jpeg|jpg|png)$/i.test(type)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 3_000_000) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i += 8192) {
      bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

/** Looks up an approved business by handle so share links stay short. */
async function businessCard(handle: string): Promise<OgCard | null> {
  try {
    const { getPublicClient } = await import("@/lib/supabase-public.server");
    const { data } = await getPublicClient()
      .from("businesses")
      .select(
        "name, cover_image_url, logo_url, address, categories(name), cities(name), governorates(name)",
      )
      .eq("username", handle.toLowerCase())
      .eq("status", "approved")
      .maybeSingle();
    if (!data) return null;
    const city = (data.cities as { name: string } | null)?.name ?? null;
    const gov = (data.governorates as { name: string } | null)?.name ?? null;
    return {
      kind: "business",
      title: data.name.slice(0, 120),
      subtitle: [city, gov].filter(Boolean).join(" - ") || data.address || null,
      badge: (data.categories as { name: string } | null)?.name ?? null,
      stats: [],
      photo: await inlinePhoto(data.cover_image_url ?? data.logo_url ?? null),
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams;
        const kindParam = (q.get("kind") ?? "site") as OgKind;
        const handle = q.get("u");
        const card: OgCard = (handle ? await businessCard(handle) : null) ?? {
          kind: KINDS.includes(kindParam) ? kindParam : "site",
          title: (q.get("t") ?? "اكتشف مدينتك").slice(0, 120),
          subtitle: q.get("s")?.slice(0, 200) || null,
          badge: q.get("b")?.slice(0, 40) || null,
          stats: (q.get("st") ?? "")
            .split("|")
            .map((s) => s.trim().slice(0, 30))
            .filter(Boolean)
            .slice(0, 3),
          photo: await inlinePhoto(q.get("img")),
        };


        try {
          const { svgToPng } = await import("@/lib/og-render.server");
          const png = await svgToPng(buildOgSvg(card));
          return new Response(png as unknown as BodyInit, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400, s-maxage=604800",
            },
          });
        } catch (err) {
          console.error("og_render_failed", err);
          // Rasterizer unavailable: fall back to the static preview image.
          return Response.redirect(new URL("/og-default.jpg", url).toString(), 302);
        }
      },
    },
  },
});
