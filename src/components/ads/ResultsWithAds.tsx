import { Fragment } from "react";
import { BusinessCard } from "@/components/BusinessCard";
import { GoogleAdCard } from "@/components/ads/GoogleAdCard";
import { SponsoredCard } from "@/components/ads/SponsoredCard";
import { useAds, type AdPlacement } from "@/hooks/useAds";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { BusinessCardData } from "@/lib/directory-types";

/**
 * Results grid that mixes organic results with paid ads and Google ad units,
 * keeping the same card shape so the layout stays consistent.
 */
export function ResultsWithAds({
  items,
  placement = "search",
}: {
  items: BusinessCardData[];
  placement?: AdPlacement;
}) {
  const ads = useAds(placement);
  const settings = useSiteSettings();
  const every = Math.max(2, settings.adsense_every || 4);
  const googleOn = Boolean(
    settings.adsense_enabled && settings.adsense_client && settings.adsense_slot,
  );

  let paidUsed = 0;
  let googleUsed = 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => {
        const slotAfter = (i + 1) % every === 0;
        let adNode: React.ReactNode = null;
        if (slotAfter) {
          if (paidUsed < ads.length) {
            adNode = <SponsoredCard key={`ad-${ads[paidUsed].id}`} ad={ads[paidUsed]} />;
            paidUsed += 1;
          } else if (googleOn && googleUsed < 3) {
            adNode = <GoogleAdCard key={`g-${googleUsed}`} />;
            googleUsed += 1;
          }
        }
        return (
          <Fragment key={item.id}>
            <BusinessCard item={item} />
            {adNode}
          </Fragment>
        );
      })}
    </div>
  );
}
