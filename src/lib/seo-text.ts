/** Shared helpers to keep meta titles/descriptions inside search-engine limits. */

/** Canonical public origin — sitemaps must never advertise preview hosts. */
export const CANONICAL_ORIGIN = "https://town-discover-egypt.lovable.app";

function squash(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const spaced = cut.replace(/\s\S*$/, "");
  return `${(spaced.length > max * 0.6 ? spaced : cut).trim()}…`;
}

/** Meta description: joined context, never longer than 158 chars. */
export function seoDescription(parts: (string | null | undefined)[], max = 158): string {
  return clamp(squash(parts), max);
}

/** Meta title: never longer than 60 chars. */
export function seoTitle(text: string, max = 60): string {
  return clamp(squash([text]), max);
}
