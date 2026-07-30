/** Builds the SVG artwork for a dynamic Open Graph card (1200x630, Arabic RTL). */

export const OG_W = 1200;
export const OG_H = 630;

export type OgKind = "business" | "city" | "search" | "site";

export interface OgCard {
  kind: OgKind;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  /** Small stat chips, e.g. ["١٢٠ نشاط", "القاهرة"]. */
  stats?: string[];
  /** Optional photo, already encoded as a data URI. */
  photo?: string | null;
}

const PALETTE: Record<OgKind, { from: string; to: string; accent: string }> = {
  business: { from: "#0b1220", to: "#123047", accent: "#38bdf8" },
  city: { from: "#0b1220", to: "#14322a", accent: "#34d399" },
  search: { from: "#0b1220", to: "#2a1636", accent: "#c084fc" },
  site: { from: "#0b1220", to: "#1e293b", accent: "#f59e0b" },
};

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Naive width-aware wrapper: Arabic glyphs are ~0.52em wide at these sizes. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }
  return lines;
}

export function buildOgSvg(card: OgCard): string {
  const c = PALETTE[card.kind] ?? PALETTE.site;
  const right = OG_W - 80; // RTL text anchor
  const titleLines = wrap(card.title, 26, 3);
  const titleSize = titleLines.length > 2 ? 62 : 76;
  let y = card.photo ? 300 : 286;

  const parts: string[] = [];
  parts.push(
    `<defs>`,
      `<linearGradient id="bg" x1="1" y1="0" x2="0" y2="1">`,
        `<stop offset="0%" stop-color="${c.from}"/>`,
        `<stop offset="100%" stop-color="${c.to}"/>`,
      `</linearGradient>`,
      `<linearGradient id="fade" x1="1" y1="0" x2="0" y2="0">`,
        `<stop offset="0%" stop-color="${c.from}" stop-opacity="1"/>`,
        `<stop offset="55%" stop-color="${c.from}" stop-opacity="0.92"/>`,
        `<stop offset="100%" stop-color="${c.from}" stop-opacity="0.25"/>`,
      `</linearGradient>`,
      `<clipPath id="clip"><rect width="${OG_W}" height="${OG_H}"/></clipPath>`,
    `</defs>`,
  );
  parts.push(`<rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>`);

  if (card.photo) {
    parts.push(
      `<g clip-path="url(#clip)"><image href="${card.photo}" x="0" y="0" width="${OG_W}" height="${OG_H}" preserveAspectRatio="xMidYMid slice"/></g>`,
      `<rect width="${OG_W}" height="${OG_H}" fill="url(#fade)"/>`,
    );
  } else {
    parts.push(
      `<circle cx="150" cy="540" r="260" fill="${c.accent}" opacity="0.10"/>`,
      `<circle cx="1080" cy="90" r="180" fill="${c.accent}" opacity="0.08"/>`,
    );
  }

  // Brand row (top-right, RTL).
  parts.push(
    `<circle cx="${right - 22}" cy="82" r="22" fill="${c.accent}"/>`,
    `<text x="${right - 60}" y="96" direction="rtl" text-anchor="end" font-family="Cairo" font-weight="700" font-size="34" fill="#ffffff">اكتشف مدينتك</text>`,
    `<text x="80" y="94" text-anchor="start" font-family="Cairo" font-size="26" fill="#ffffff" opacity="0.7">durtown.com</text>`,
  );

  if (card.badge) {
    const w = Math.min(520, card.badge.length * 18 + 48);
    parts.push(
      `<rect x="${right - w}" y="${y - 128}" rx="26" ry="26" width="${w}" height="52" fill="${c.accent}" opacity="0.18"/>`,
      `<text x="${right - 24}" y="${y - 92}" direction="rtl" text-anchor="end" font-family="Cairo" font-weight="700" font-size="28" fill="${c.accent}">${esc(card.badge)}</text>`,
    );
  }

  for (const line of titleLines) {
    parts.push(
      `<text x="${right}" y="${y}" direction="rtl" text-anchor="end" font-family="Cairo" font-weight="700" font-size="${titleSize}" fill="#ffffff">${esc(line)}</text>`,
    );
    y += titleSize + 14;
  }

  if (card.subtitle) {
    y += 8;
    for (const line of wrap(card.subtitle, 52, 2)) {
      parts.push(
        `<text x="${right}" y="${y}" direction="rtl" text-anchor="end" font-family="Cairo" font-size="34" fill="#e2e8f0" opacity="0.92">${esc(line)}</text>`,
      );
      y += 48;
    }
  }

  const stats = (card.stats ?? []).filter(Boolean).slice(0, 3);
  if (stats.length) {
    let x = right;
    for (const s of stats) {
      const w = Math.min(420, s.length * 17 + 44);
      parts.push(
        `<rect x="${x - w}" y="${OG_H - 128}" rx="24" ry="24" width="${w}" height="52" fill="#ffffff" opacity="0.10"/>`,
        `<text x="${x - 22}" y="${OG_H - 92}" direction="rtl" text-anchor="end" font-family="Cairo" font-size="27" fill="#ffffff">${esc(s)}</text>`,
      );
      x -= w + 16;
    }
  }

  parts.push(
    `<rect x="0" y="${OG_H - 12}" width="${OG_W}" height="12" fill="${c.accent}"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">${parts.join("")}</svg>`;
}
