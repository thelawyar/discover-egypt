import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, MapPin, Phone, Star, Store } from "lucide-react";
import type { BusinessCardData } from "@/lib/directory-types";
import { Highlight, matchesTerms } from "@/lib/highlight";
import { SmartImage } from "@/components/SmartImage";
import { supabase } from "@/integrations/supabase/client";

export function BusinessCard({
  item,
  terms = [],
}: {
  item: BusinessCardData;
  terms?: string[];
}) {
  /** Fire-and-forget click tracking so the directory dashboard can rank cards. */
  function trackClick() {
    void supabase.rpc("track_business_event", {
      _business_id: item.id,
      _event_type: "card_click",
      _source: "results",
    });
  }

  return (
    <Link
      to="/$username"
      params={{ username: item.username }}
      onClick={trackClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-raised"
    >

      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <SmartImage
          src={businessCover(item.cover_image_url)}
          thumbSrc={item.cover_image_url ? item.cover_thumb_url : null}
          alt={item.name}
          width={1200}
          height={750}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          className="size-full object-cover duration-300 group-hover:scale-105"
        />

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {item.is_featured ? (
            <span className="flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold text-warning-foreground">
              <Star className="size-3 fill-current" />
              مميز
            </span>
          ) : null}
          {item.is_hiring ? (
            <span className="flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-success-foreground">
              <BriefcaseBusiness className="size-3" />
              يوظّف
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-bold text-foreground">
            <Highlight text={item.name} terms={terms} />
          </h3>
          {item.category_name ? (
            <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
              <Highlight text={item.category_name} terms={terms} />
            </span>
          ) : null}
        </div>

        {item.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            <Highlight text={item.description} terms={terms} />
          </p>
        ) : null}

        {item.products.length ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[...item.products]
              .sort(
                (a, b) =>
                  Number(matchesTerms(b, terms)) - Number(matchesTerms(a, terms)),
              )
              .slice(0, 3)
              .map((p) => (
                <span
                  key={p}
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    matchesTerms(p, terms)
                      ? "bg-primary-soft text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Highlight text={p} terms={terms} />
                </span>
              ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            <Highlight text={item.city_name ?? "—"} terms={terms} />
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
