/**
 * Shared vocabulary for the enriched business attributes (services, payment
 * methods, audience, vibe, occasions and price level).
 *
 * Values are stable English slugs stored in Postgres text[] columns; the
 * Arabic label is presentation only. Keeping slugs stable means filters,
 * the AI interpreter and the database always speak the same language.
 */

export type AttrOption = { value: string; label: string };

export const AMENITIES: AttrOption[] = [
  { value: "wifi", label: "واي فاي" },
  { value: "parking", label: "موقف سيارات" },
  { value: "delivery", label: "توصيل" },
  { value: "takeaway", label: "تيك أواي" },
  { value: "kids_area", label: "ركن أطفال" },
  { value: "outdoor", label: "جلسات خارجية" },
  { value: "indoor", label: "جلسات داخلية" },
  { value: "smoking", label: "منطقة تدخين" },
  { value: "non_smoking", label: "خالٍ من التدخين" },
  { value: "wheelchair", label: "مناسب لذوي الهمم" },
  { value: "pet_friendly", label: "يسمح بالحيوانات الأليفة" },
  { value: "ac", label: "تكييف" },
  { value: "reservation", label: "حجز مسبق" },
  { value: "open_24h", label: "يعمل 24 ساعة" },
  { value: "home_service", label: "خدمة منزلية" },
  { value: "live_music", label: "موسيقى حية" },
];

export const PAYMENTS: AttrOption[] = [
  { value: "cash", label: "كاش" },
  { value: "visa", label: "فيزا / ماستركارد" },
  { value: "instapay", label: "انستاباي" },
  { value: "vodafone_cash", label: "فودافون كاش" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "installments", label: "تقسيط" },
];

export const GOOD_FOR: AttrOption[] = [
  { value: "families", label: "مناسب للعائلات" },
  { value: "kids", label: "مناسب للأطفال" },
  { value: "couples", label: "مناسب للأزواج" },
  { value: "work", label: "مناسب للعمل" },
  { value: "study", label: "مناسب للمذاكرة" },
  { value: "friends", label: "مناسب للأصدقاء" },
  { value: "solo", label: "مناسب للفرد" },
  { value: "groups", label: "مناسب للمجموعات" },
];

export const VIBES: AttrOption[] = [
  { value: "quiet", label: "هادئ" },
  { value: "romantic", label: "رومانسي" },
  { value: "lively", label: "حيوي" },
  { value: "cozy", label: "دافئ ومريح" },
  { value: "luxury", label: "فاخر" },
  { value: "casual", label: "بسيط" },
  { value: "traditional", label: "تراثي" },
  { value: "modern", label: "عصري" },
];

export const OCCASIONS: AttrOption[] = [
  { value: "birthday", label: "عيد ميلاد" },
  { value: "wedding", label: "فرح" },
  { value: "engagement", label: "خطوبة" },
  { value: "graduation", label: "تخرج" },
  { value: "baby_shower", label: "Baby Shower" },
  { value: "meeting", label: "اجتماع عمل" },
  { value: "date", label: "موعد رومانسي" },
  { value: "gathering", label: "تجمع عائلي" },
];

export const PRICE_LEVELS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "$", hint: "اقتصادي" },
  { value: 2, label: "$$", hint: "متوسط" },
  { value: 3, label: "$$$", hint: "مرتفع" },
  { value: 4, label: "$$$$", hint: "فاخر" },
];

export const ATTR_GROUPS = [
  { key: "amenities", title: "الخدمات المتوفرة", options: AMENITIES },
  { key: "payment_methods", title: "طرق الدفع", options: PAYMENTS },
  { key: "good_for", title: "مناسب لـ", options: GOOD_FOR },
  { key: "vibes", title: "الأجواء", options: VIBES },
  { key: "occasions", title: "المناسبات", options: OCCASIONS },
] as const;

export type AttrGroupKey = (typeof ATTR_GROUPS)[number]["key"];

const ALL: AttrOption[] = [
  ...AMENITIES,
  ...PAYMENTS,
  ...GOOD_FOR,
  ...VIBES,
  ...OCCASIONS,
];

const LABELS = new Map(ALL.map((o) => [o.value, o.label]));

/** Arabic label for a stored slug (falls back to the slug itself). */
export function attrLabel(value: string): string {
  return LABELS.get(value) ?? value;
}

export function priceLabel(level: number | null | undefined): string | null {
  const found = PRICE_LEVELS.find((p) => p.value === level);
  return found ? found.label : null;
}

/** Keeps only slugs that exist in the shared vocabulary. */
export function sanitizeAttrs(values: string[], options: AttrOption[]): string[] {
  const allowed = new Set(options.map((o) => o.value));
  return Array.from(new Set(values.filter((v) => allowed.has(v)))).slice(0, 20);
}

/** Compact vocabulary string handed to the AI interpreter. */
export function attrVocabulary(): string {
  return ATTR_GROUPS.map(
    (g) =>
      `${g.key}: ${g.options.map((o) => `${o.value} (${o.label})`).join(", ")}`,
  ).join("\n");
}
