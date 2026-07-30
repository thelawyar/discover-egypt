import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  adsense_enabled: boolean;
  adsense_client: string | null;
  adsense_slot: string | null;
  adsense_slot_search: string | null;
  adsense_slot_business: string | null;
  adsense_every: number;
  ad_positions: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "اكتشف مدينتك",
  tagline: "دليل تجاري شامل لكل المدن المصرية",
  logo_url: null,
  primary_color: "#2f6df6",
  accent_color: "#eaf1ff",
  adsense_enabled: false,
  adsense_client: null,
  adsense_slot: null,
  adsense_slot_search: null,
  adsense_slot_business: null,
  adsense_every: 4,
  ad_positions: "3,6",
};

export const siteSettingsQuery = {
  queryKey: ["site-settings"],
  staleTime: 60_000,
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(
        "site_name,tagline,logo_url,primary_color,accent_color,adsense_enabled,adsense_client,adsense_slot,adsense_slot_search,adsense_slot_business,adsense_every,ad_positions",
      )
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as SiteSettings;
  },
};

export function useSiteSettings() {
  const { data } = useQuery(siteSettingsQuery);
  return data ?? DEFAULT_SETTINGS;
}

/** Applies the admin-managed brand colors as CSS variables on <html>. */
export function BrandingStyles() {
  const settings = useSiteSettings();
  const { primary_color: primary, accent_color: accent } = settings;

  useEffect(() => {
    const root = document.documentElement;
    const vars: Record<string, string> = {
      "--primary": primary,
      "--ring": primary,
      "--sidebar-primary": primary,
      "--primary-soft": accent,
      "--accent": accent,
      "--sidebar-accent": accent,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
    };
  }, [primary, accent]);

  return null;
}
