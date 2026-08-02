/** Shared vocabulary for offers & events (client-safe: no server imports). */

export type EventKind = "offer" | "party" | "opening" | "match" | "event";

export const EVENT_KINDS: { value: EventKind; label: string; emoji: string }[] = [
  { value: "offer", label: "عرض", emoji: "🏷️" },
  { value: "party", label: "حفلة", emoji: "🎉" },
  { value: "opening", label: "افتتاح", emoji: "✂️" },
  { value: "match", label: "مباراة", emoji: "⚽" },
  { value: "event", label: "حدث", emoji: "📅" },
];

export const EVENT_KIND_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_KINDS.map((k) => [k.value, k.label]),
);

export const EVENT_KIND_EMOJI: Record<string, string> = Object.fromEntries(
  EVENT_KINDS.map((k) => [k.value, k.emoji]),
);

export type EventWhen = "upcoming" | "today" | "week" | "month" | "past";

export const EVENT_WHEN: { value: EventWhen; label: string }[] = [
  { value: "upcoming", label: "القادمة" },
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "past", label: "المنتهية" },
];

export type EventCardData = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  image_url: string | null;
  venue: string | null;
  external_url: string | null;
  price_info: string | null;
  starts_at: string;
  ends_at: string | null;
  is_featured: boolean;
  business_id: string | null;
  business_name: string | null;
  business_username: string | null;
  business_cover: string | null;
  city_name: string | null;
  governorate_name: string | null;
};

/** "الجمعة 12 يوليو · 8:00 م" */
export function formatEventDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

/** True when the event is running right now. */
export function isLive(item: { starts_at: string; ends_at: string | null }): boolean {
  const now = Date.now();
  const start = new Date(item.starts_at).getTime();
  const end = item.ends_at ? new Date(item.ends_at).getTime() : start + 86400000;
  return now >= start && now <= end;
}
