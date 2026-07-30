import { ExternalLink, Store } from "lucide-react";
import type { Ad } from "@/hooks/useAds";

/** Paid ad rendered with the same visual weight as a business card. */
export function SponsoredCard({ ad }: { ad: Ad }) {
  return (
    <a
      href={ad.target_url}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-raised"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={ad.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Store className="size-10" />
          </div>
        )}
        <span className="absolute top-3 right-3 rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold text-warning-foreground">
          إعلان مموّل
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-base font-bold text-foreground">{ad.title}</h3>
        {ad.body ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{ad.body}</p>
        ) : null}
        <div className="mt-auto flex items-center gap-1 pt-3 text-xs text-muted-foreground">
          <ExternalLink className="size-3.5" />
          {ad.advertiser ?? "إعلان"}
        </div>
      </div>
    </a>
  );
}
