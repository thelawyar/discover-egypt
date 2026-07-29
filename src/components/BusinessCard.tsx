import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Star, Store } from "lucide-react";
import type { BusinessCardData } from "@/lib/directory-types";

export function BusinessCard({ item }: { item: BusinessCardData }) {
  return (
    <Link
      to="/business/$id"
      params={{ id: item.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-raised"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {item.cover_image_url ? (
          <img
            src={item.cover_image_url}
            alt={item.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Store className="size-10" />
          </div>
        )}
        {item.is_featured ? (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold text-warning-foreground">
            <Star className="size-3 fill-current" />
            مميز
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-bold text-foreground">
            {item.name}
          </h3>
          {item.category_name ? (
            <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
              {item.category_name}
            </span>
          ) : null}
        </div>

        {item.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}

        {item.products.length ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.products.slice(0, 3).map((p) => (
              <span
                key={p}
                className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {item.city_name ?? "—"}
            {item.governorate_name ? ` · ${item.governorate_name}` : ""}
          </span>
          {item.phone ? (
            <span className="flex items-center gap-1" dir="ltr">
              <Phone className="size-3.5" />
              {item.phone}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
