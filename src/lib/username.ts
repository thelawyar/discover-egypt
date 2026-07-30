/** Public handle rules for business mini-sites: durtown.com/<username>. */

export const RESERVED_USERNAMES = [
  "admin",
  "admin-cities",
  "admin-categories",
  "admin-setup",
  "auth",
  "search",
  "city",
  "business",
  "dashboard",
  "api",
  "sitemap",
  "sitemap.xml",
  "robots",
  "robots.txt",
  "assets",
  "static",
  "login",
  "signup",
  "settings",
  "about",
  "contact",
  "ads",
];

export const USERNAME_HINT =
  "حروف إنجليزية وأرقام وشرطة (-) فقط، من 3 إلى 32 حرفًا.";

/** Lowercase and strip anything that is not a-z, 0-9 or a dash. */
export function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Returns an Arabic error message, or null when the handle is valid. */
export function validateUsername(value: string): string | null {
  const v = normalizeUsername(value);
  if (v.length < 3 || v.length > 32) return `الرابط غير صالح: ${USERNAME_HINT}`;
  if (/^-|-$/.test(v)) return "الرابط لا يبدأ أو ينتهي بشرطة.";
  if (RESERVED_USERNAMES.includes(v)) return "هذا الرابط محجوز، اختر رابطًا آخر.";
  return null;
}
