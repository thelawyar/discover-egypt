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

const AD_SELECT =
  "id,title,body,image_url,target_url,advertiser,placement,governorate_id,city_id,category_id,priority";

/** Active paid ads for a placement (RLS already filters by activity window). */
export function useAds(placement: AdPlacement) {
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
  return data ?? [];
}

/** Registers a click on a paid ad without blocking navigation. */
export function trackAdClick(id: string) {
  void supabase.rpc("increment_ad_click" as never, { _id: id } as never).then(
    () => undefined,
    () => undefined,
  );
}
