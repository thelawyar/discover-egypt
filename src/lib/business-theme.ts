import type { CSSProperties } from "react";

/** Visual presets for the public one-page mini-site (durtown.com/<username>). */
export type ThemeStyleId = "classic" | "soft" | "dark";
export type ThemeFontId = "cairo" | "tajawal" | "almarai" | "amiri";
export type ThemeButtonId = "rounded" | "pill" | "square" | "outline";

export type BusinessThemeInput = {
  theme_primary?: string | null;
  theme_bg?: string | null;
  theme_style?: string | null;
  theme_font?: string | null;
  theme_button?: string | null;
  theme_contrast?: boolean | null;
};

export type ResolvedTheme = {
  style: ThemeStyleId;
  font: ThemeFontId;
  fontFamily: string;
  button: ThemeButtonId;
  buttonRadius: string;
  buttonOutlined: boolean;
  contrast: boolean;
  primary: string;
  onPrimary: string;
  bg: string;
  fg: string;
  card: string;
  border: string;
  muted: string;
  soft: string;
};

export const THEME_STYLES: { id: ThemeStyleId; label: string }[] = [
  { id: "classic", label: "كلاسيكي" },
  { id: "soft", label: "ناعم" },
  { id: "dark", label: "داكن" },
];

export const THEME_FONTS: { id: ThemeFontId; label: string; family: string }[] = [
  { id: "cairo", label: "Cairo — عصري", family: '"Cairo", system-ui, sans-serif' },
  { id: "tajawal", label: "Tajawal — بسيط", family: '"Tajawal", system-ui, sans-serif' },
  { id: "almarai", label: "Almarai — واضح", family: '"Almarai", system-ui, sans-serif' },
  { id: "amiri", label: "Amiri — كلاسيكي", family: '"Amiri", Georgia, serif' },
];

export const THEME_BUTTONS: { id: ThemeButtonId; label: string }[] = [
  { id: "rounded", label: "زوايا ناعمة" },
  { id: "pill", label: "دائري" },
  { id: "square", label: "زوايا حادة" },
  { id: "outline", label: "محدد بإطار" },
];

export const THEME_PRESETS = [
  { label: "أزرق", primary: "#2f6df6", bg: "#ffffff" },
  { label: "أخضر", primary: "#0f9d58", bg: "#f6fbf7" },
  { label: "برتقالي", primary: "#f4820b", bg: "#fffaf3" },
  { label: "بنفسجي", primary: "#7c3aed", bg: "#faf7ff" },
  { label: "أحمر", primary: "#e2453c", bg: "#fff8f7" },
  { label: "ليلي", primary: "#60a5fa", bg: "#0f172a" },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(value: string | null | undefined): boolean {
  return Boolean(value && HEX_RE.test(value.trim()));
}

function clean(value: string | null | undefined, fallback: string): string {
  return isHexColor(value) ? value!.trim() : fallback;
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** True when the background is dark enough that text must flip to light. */
export function isDarkColor(hex: string): boolean {
  const [r, g, b] = toRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function mix(hex: string, target: string, amount: number): string {
  const a = toRgb(hex);
  const b = toRgb(target);
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function resolveTheme(
  input: BusinessThemeInput | null | undefined,
  prefersDark = false,
): ResolvedTheme {
  const styleRaw = (input?.theme_style ?? "classic") as ThemeStyleId;
  const style: ThemeStyleId = THEME_STYLES.some((s) => s.id === styleRaw)
    ? styleRaw
    : "classic";

  const defaults: Record<ThemeStyleId, { primary: string; bg: string }> = {
    classic: { primary: "#2f6df6", bg: "#ffffff" },
    soft: { primary: "#0f9d58", bg: "#f5f7fb" },
    dark: { primary: "#60a5fa", bg: "#0f172a" },
  };

  const contrast = Boolean(input?.theme_contrast);
  const primaryRaw = clean(input?.theme_primary, defaults[style].primary);
  const bgRaw = clean(input?.theme_bg, defaults[style].bg);
  // Site-wide dark mode: flip a light page background to the app's dark surface
  // and lift the accent so it stays readable on it.
  const bg = prefersDark && !isDarkColor(bgRaw) ? "#0d1424" : bgRaw;
  const dark = isDarkColor(bg);
  const primaryBase =
    prefersDark && !isDarkColor(bgRaw) && isDarkColor(primaryRaw)
      ? mix(primaryRaw, "#ffffff", 0.35)
      : primaryRaw;


  // High-contrast mode nudges the accent away from the background so text stays readable.
  const primary = contrast
    ? mix(primaryRaw, dark ? "#ffffff" : "#000000", 0.18)
    : primaryRaw;

  const fontRaw = (input?.theme_font ?? "cairo") as ThemeFontId;
  const font: ThemeFontId = THEME_FONTS.some((f) => f.id === fontRaw)
    ? fontRaw
    : "cairo";

  const buttonRaw = (input?.theme_button ?? "rounded") as ThemeButtonId;
  const button: ThemeButtonId = THEME_BUTTONS.some((b) => b.id === buttonRaw)
    ? buttonRaw
    : "rounded";

  const radius: Record<ThemeButtonId, string> = {
    rounded: "0.75rem",
    pill: "9999px",
    square: "0.25rem",
    outline: "0.75rem",
  };

  return {
    style,
    font,
    fontFamily: THEME_FONTS.find((f) => f.id === font)!.family,
    button,
    buttonRadius: radius[button],
    buttonOutlined: button === "outline",
    contrast,
    primary,
    onPrimary: isDarkColor(primary) ? "#ffffff" : "#0b0b0c",
    bg,
    fg: dark ? "#f8fafc" : contrast ? "#0a0a0b" : "#131417",
    card: dark ? mix(bg, "#ffffff", 0.08) : mix(bg, "#ffffff", 0.6),
    border: contrast
      ? dark
        ? mix(bg, "#ffffff", 0.34)
        : mix(bg, "#000000", 0.28)
      : dark
        ? mix(bg, "#ffffff", 0.16)
        : mix(bg, "#000000", 0.1),
    muted: contrast
      ? dark
        ? mix(bg, "#ffffff", 0.78)
        : mix(bg, "#000000", 0.68)
      : dark
        ? mix(bg, "#ffffff", 0.55)
        : mix(bg, "#000000", 0.45),
    soft: mix(primary, bg, contrast ? 0.78 : 0.86),
  };
}

/** CSS custom properties consumed by the mini-site markup. */
export function themeVars(theme: ResolvedTheme): CSSProperties {
  return {
    "--biz-primary": theme.primary,
    "--biz-on-primary": theme.onPrimary,
    "--biz-bg": theme.bg,
    "--biz-fg": theme.fg,
    "--biz-card": theme.card,
    "--biz-border": theme.border,
    "--biz-muted": theme.muted,
    "--biz-soft": theme.soft,
    "--biz-btn-radius": theme.buttonRadius,
    fontFamily: theme.fontFamily,
    backgroundColor: "var(--biz-bg)",
    color: "var(--biz-fg)",
  } as CSSProperties;
}
