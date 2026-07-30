import { Fragment } from "react";
import { BusinessCard } from "@/components/BusinessCard";
import { GoogleAdCard } from "@/components/ads/GoogleAdCard";
import { SponsoredCard } from "@/components/ads/SponsoredCard";
import { useAds, type AdPlacement, type AdTargeting } from "@/hooks/useAds";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { adSlotIndexes, adsenseSlotFor, type AdPageType } from "@/lib/ads-config";
import type { BusinessCardData } from "@/lib/directory-types";

/**
 * Results grid that mixes organic results with paid ads and Google ad units,
 * keeping the same card shape so the layout stays consistent.
 */
export function ResultsWithAds({
  items,
  placement = "search",
  pageType = "search",
  targeting,
}: {
  items: BusinessCardData[];
  placement?: AdPlacement;
  pageType?: AdPageType;
  targeting?: AdTargeting;
}) {
  const ads = useAds(placement, targeting);
  const settings = useSiteSettings();
  const slots = new Set(adSlotIndexes(settings, items.length));
  const googleOn = Boolean(
    settings.adsense_enabled &&
      settings.adsense_client &&
      adsenseSlotFor(settings, pageType),
  );

  let paidUsed = 0;
  let googleUsed = 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => {
        let adNode: React.ReactNode = null;
        if (slots.has(i + 1)) {
          if (paidUsed < ads.length) {
            adNode = <SponsoredCard key={`ad-${ads[paidUsed].id}`} ad={ads[paidUsed]} />;
            paidUsed += 1;
          } else if (googleOn && googleUsed < 3) {
            adNode = <GoogleAdCard key={`g-${googleUsed}`} pageType={pageType} />;
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
