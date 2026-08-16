import defaultCover from "@/assets/default-business-cover.jpg";
import defaultLogo from "@/assets/default-business-logo.jpg";

/** Placeholder artwork shown until a business uploads its own cover/logo. */
export const DEFAULT_BUSINESS_COVER = defaultCover;
export const DEFAULT_BUSINESS_LOGO = defaultLogo;

export function businessCover(url: string | null | undefined): string {
  return url && url.trim() ? url : DEFAULT_BUSINESS_COVER;
}

export function businessLogo(url: string | null | undefined): string {
  return url && url.trim() ? url : DEFAULT_BUSINESS_LOGO;
}
