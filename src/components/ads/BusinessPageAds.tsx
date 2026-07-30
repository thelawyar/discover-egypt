import { GoogleAdCard } from "@/components/ads/GoogleAdCard";
import { SponsoredCard } from "@/components/ads/SponsoredCard";
import { useAds, type AdTargeting } from "@/hooks/useAds";

/** Ad column shown on the business detail page (paid first, then AdSense). */
export function BusinessPageAds({ targeting }: { targeting?: AdTargeting }) {
  const ads = useAds("business", targeting);
  const ad = ads[0];

  return (
    <div className="space-y-4">
      {ad ? <SponsoredCard ad={ad} /> : null}
      <GoogleAdCard pageType="business" />
    </div>
  );
}
