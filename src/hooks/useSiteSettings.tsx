import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  icon_url: string | null;
  hero_title: string;
  hero_subtitle: string;
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
  site_name: "durtown",
  tagline: "DISCOVER YOUR TOWN — الدليل التجاري الشامل لكل المدن المصرية",
  logo_url: null,
  logo_dark_url: null,
  icon_url: null,
  hero_title: "استكشف مدينتك",
  hero_subtitle: "الدليل التجاري الشامل لكل المدن المصرية",
  primary_color: "#2F6DF6",
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
        "site_name,tagline,logo_url,logo_dark_url,icon_url,hero_title,hero_subtitle,primary_color,accent_color,adsense_enabled,adsense_client,adsense_slot,adsense_slot_search,adsense_slot_business,adsense_every,ad_positions",
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

/**
 * Applies the admin-managed brand colors as CSS variables.
 * Rendered as a <style> tag so the colors are already correct on the very first
 * paint (SSR) instead of flashing the defaults first.
 */
export function BrandingStyles() {
  const { primary_color: primary, accent_color: accent } = useSiteSettings();
  const css = `:root{--primary:${primary};--ring:${primary};--sidebar-primary:${primary};--primary-soft:${accent};--accent:${accent};--sidebar-accent:${accent};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
