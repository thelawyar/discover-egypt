import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdPlacement = "home" | "search" | "business";

export type Ad = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
  advertiser: string | null;
  placement: AdPlacement;
  governorate_id: string | null;
  city_id: string | null;
  category_id: string | null;
  priority: number;
};

/** Where the visitor currently is, used to match ad targeting rules. */
export type AdTargeting = {
  governorateId?: string | null;
  cityId?: string | null;
  categoryId?: string | null;
};

const AD_SELECT =
  "id,title,body,image_url,target_url,advertiser,placement,governorate_id,city_id,category_id,priority";

/** An ad matches when each of its targeting fields is empty or equal to the context. */
export function adMatchesTargeting(ad: Ad, ctx: AdTargeting = {}): boolean {
  if (ad.governorate_id && ad.governorate_id !== ctx.governorateId) return false;
  if (ad.city_id && ad.city_id !== ctx.cityId) return false;
  if (ad.category_id && ad.category_id !== ctx.categoryId) return false;
  return true;
}

/** Active paid ads for a placement (RLS already filters by activity window). */
export function useAds(placement: AdPlacement, targeting: AdTargeting = {}) {
  const { data } = useQuery({
    queryKey: ["ads", placement],
    staleTime: 60_000,
    queryFn: async (): Promise<Ad[]> => {
      const { data, error } = await supabase
        .from("ads")
        .select(AD_SELECT)
        .eq("placement", placement)
        .order("priority", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Ad[];
    },
  });

  return (data ?? []).filter((ad) => adMatchesTargeting(ad, targeting));
}

/** Fire-and-forget ad metrics (counters live in the database). */
export function trackAdImpression(adId: string) {
  void supabase.rpc("track_ad_impression", { _ad_id: adId });
}

export function trackAdClick(adId: string) {
  void supabase.rpc("track_ad_click", { _ad_id: adId });
}
