/** Shared helpers for building valid, absolute Open Graph image tags. */

export const DEFAULT_OG_IMAGE = "/og-default.jpg";
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function mimeFor(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? "image/jpeg";
}

/** Turns a possibly-relative/missing image into an absolute https URL, with a smart fallback. */
export function absoluteOgImage(
  image: string | null | undefined,
  origin: string | null | undefined,
): string | null {
  const base = (origin ?? "").replace(/\/$/, "");
  const candidate = image?.trim();
  if (candidate) {
    const abs = candidate.startsWith("http")
      ? candidate
      : `${base}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
    if (abs.startsWith("https://")) return abs;
  }
  if (!base.startsWith("https://")) return null;
  return `${base}${DEFAULT_OG_IMAGE}`;
}

type Meta = Record<string, string>;

/** Full set of og:image / twitter:image meta entries (always valid, never partial). */
export function ogImageMeta(
  image: string | null | undefined,
  origin: string | null | undefined,
  alt: string,
): Meta[] {
  const url = absoluteOgImage(image, origin);
  if (!url) return [];
  return [
    { property: "og:image", content: url },
    { property: "og:image:secure_url", content: url },
    { property: "og:image:type", content: mimeFor(url) },
    { property: "og:image:width", content: String(OG_WIDTH) },
    { property: "og:image:height", content: String(OG_HEIGHT) },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: alt },
  ];
}
