/**
 * Arabic text normalisation, mirrored exactly by the SQL function `public.ar_norm`.
 * Keeps search matching tolerant to hamza forms, ta-marbuta, alef-maqsura,
 * tatweel and diacritics, so "الجمال" matches "الجمًال" and "العمرة" matches "العمره".
 */
const DIACRITICS = /[\u0640\u064B-\u0652\u0670\u0653-\u0655]/g;

const MAP: Record<string, string> = {
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ٱ: "ا",
  ى: "ي",
  ئ: "ي",
  ؤ: "ا",
  ة: "ه",
  ڤ: "ف",
  گ: "ك",
  چ: "ش",
};

export function arNorm(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(/[أإآٱىئؤةڤگچ]/g, (c) => MAP[c] ?? c)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
