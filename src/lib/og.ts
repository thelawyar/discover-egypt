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

export interface OgCardParams {
  kind: "business" | "city" | "search" | "site";
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  stats?: (string | null | undefined)[];
  /** Real photo to use as the card background (business cover, first result, ...). */
  photo?: string | null;
}

/**
 * URL of the dynamically rendered Open Graph card for a page.
 * Returns null when the origin isn't an absolute https URL (crawlers need absolute).
 */
export function ogCardUrl(
  params: OgCardParams,
  origin: string | null | undefined,
): string | null {
  const base = (origin ?? "").replace(/\/$/, "");
  if (!base.startsWith("https://")) return null;
  const usp = new URLSearchParams();
  usp.set("kind", params.kind);
  usp.set("t", params.title.slice(0, 120));
  if (params.subtitle) usp.set("s", params.subtitle.slice(0, 200));
  if (params.badge) usp.set("b", params.badge.slice(0, 40));
  const stats = (params.stats ?? []).filter((s): s is string => Boolean(s));
  if (stats.length) usp.set("st", stats.slice(0, 3).join("|"));
  const photo = absoluteOgImage(params.photo, base);
  // absoluteOgImage falls back to the static default; only pass through real photos.
  if (params.photo && photo && !photo.endsWith(DEFAULT_OG_IMAGE)) usp.set("img", photo);
  return `${base}/api/public/og?${usp.toString()}`;
}

/** Meta entries for a generated card, with the static image as last-resort fallback. */
export function ogCardMeta(
  params: OgCardParams,
  origin: string | null | undefined,
  alt?: string,
): Meta[] {
  const url = ogCardUrl(params, origin);
  if (!url) return ogImageMeta(params.photo ?? null, origin, alt ?? params.title);
  return [
    { property: "og:image", content: url },
    { property: "og:image:secure_url", content: url },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: String(OG_WIDTH) },
    { property: "og:image:height", content: String(OG_HEIGHT) },
    { property: "og:image:alt", content: alt ?? params.title },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: alt ?? params.title },
  ];
}

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

/**
 * Short, crawler-friendly card URL for a business handle. The cover photo is
 * resolved server-side, so the link stays small enough for WhatsApp/Telegram.
 */
export function businessOgMeta(
  username: string,
  origin: string | null | undefined,
  alt: string,
  version?: string | null,
): Meta[] {
  const base = (origin ?? "").replace(/\/$/, "");
  if (!base.startsWith("https://")) return [];
  const usp = new URLSearchParams({ u: username });
  if (version) usp.set("v", version.slice(0, 24));
  const url = `${base}/api/public/og?${usp.toString()}`;
  return [
    { property: "og:image", content: url },
    { property: "og:image:secure_url", content: url },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: String(OG_WIDTH) },
    { property: "og:image:height", content: String(OG_HEIGHT) },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: alt },
  ];
}
