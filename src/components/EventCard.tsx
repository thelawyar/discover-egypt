import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import {
  EVENT_KIND_EMOJI,
  EVENT_KIND_LABELS,
  formatEventDate,
  isLive,
  type EventCardData,
} from "@/lib/event-kinds";

export function EventCard({ item }: { item: EventCardData }) {
  const cover = item.image_url ?? item.business_cover;
  return (
    <Link
      to="/events/$id"
      params={{ id: item.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-raised"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {cover ? (
          <SmartImage
            src={cover}
            alt={item.title}
            width={1200}
            height={675}
            sizes="(max-width: 640px) 100vw, 380px"
            className="size-full object-cover duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl">
            {EVENT_KIND_EMOJI[item.kind] ?? "📅"}
          </div>
        )}
        <span className="absolute top-3 right-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold">
          {EVENT_KIND_EMOJI[item.kind]} {EVENT_KIND_LABELS[item.kind] ?? "حدث"}
        </span>
        {isLive(item) ? (
          <span className="absolute top-3 left-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground">
            جارٍ الآن
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-bold">{item.title}</h3>
        {item.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        ) : null}
        <div className="mt-auto space-y-1 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatEventDate(item.starts_at)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {item.venue || item.business_name || "—"}
            {item.city_name ? ` · ${item.city_name}` : ""}
          </span>
          {item.price_info ? (
            <span className="flex items-center gap-1">
              <Ticket className="size-3.5" />
              {item.price_info}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
