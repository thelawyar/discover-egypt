/**
 * Natural-language search interpreter.
 *
 * Turns a descriptive Arabic query ("ابني عنده عيد ميلاد وعايز مكان هادي للعائلات")
 * into concrete directory filters (category, city, amenities, vibes, price…).
 * Server-only: it calls the Lovable AI gateway with the project key.
 */
import { attrVocabulary } from "./business-attributes";

export type Interpretation = {
  keywords: string;
  category: string | null;
  city: string | null;
  amenities: string[];
  payment_methods: string[];
  good_for: string[];
  vibes: string[];
  occasions: string[];
  price_max: number | null;
  open_now: boolean;
  summary: string;
};

const EMPTY: Interpretation = {
  keywords: "",
  category: null,
  city: null,
  amenities: [],
  payment_methods: [],
  good_for: [],
  vibes: [],
  occasions: [],
  price_max: null,
  open_now: false,
  summary: "",
};

const cache = new Map<string, { at: number; value: Interpretation }>();
const TTL = 1000 * 60 * 30;

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string").slice(0, 8)
    : [];
}

export async function interpretQuery(
  term: string,
  categories: string[],
  cities: string[],
): Promise<Interpretation | null> {
  const key = term.trim().toLowerCase();
  if (key.length < 6) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const system = [
    "أنت مفسّر بحث لدليل تجاري مصري.",
    "حوّل جملة المستخدم إلى فلاتر بحث واقعية. أعد JSON فقط بالمفاتيح:",
    "keywords (كلمات بحث عربية مختصرة), category (اسم تصنيف من القائمة أو null),",
    "city (اسم مدينة من القائمة أو null), amenities, payment_methods, good_for, vibes,",
    "occasions (مصفوفات من القيم المسموحة فقط), price_max (1-4 أو null),",
    "open_now (true/false), summary (جملة عربية قصيرة تشرح فهمك للطلب).",
    "لا تخترع قيمًا خارج القوائم.",
    "",
    "القيم المسموحة:",
    attrVocabulary(),
    "",
    `التصنيفات: ${categories.slice(0, 120).join("، ")}`,
    `المدن: ${cities.slice(0, 200).join("، ")}`,
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: term.slice(0, 300) },
        ],
      }),
    });

    if (!res.ok) {
      console.error("interpretQuery failed", res.status, await res.text());
      return null;
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const value: Interpretation = {
      ...EMPTY,
      keywords: typeof parsed.keywords === "string" ? parsed.keywords.slice(0, 100) : "",
      category: typeof parsed.category === "string" ? parsed.category : null,
      city: typeof parsed.city === "string" ? parsed.city : null,
      amenities: strArray(parsed.amenities),
      payment_methods: strArray(parsed.payment_methods),
      good_for: strArray(parsed.good_for),
      vibes: strArray(parsed.vibes),
      occasions: strArray(parsed.occasions),
      price_max:
        typeof parsed.price_max === "number" && parsed.price_max >= 1 && parsed.price_max <= 4
          ? Math.round(parsed.price_max)
          : null,
      open_now: parsed.open_now === true,
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 160) : "",
    };

    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    console.error("interpretQuery error", err);
    return null;
  }
}
