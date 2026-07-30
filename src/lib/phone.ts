/**
 * Egyptian phone helpers.
 * WhatsApp deep links (wa.me) only work with a full international number,
 * so local numbers such as 01012345678 must become 201012345678.
 */
const EG_CODE = "20";

/** Normalises any Egyptian input to a wa.me friendly `+20...` display value. */
export function normalizeEgyptWhatsApp(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  // Keep digits only; a leading "+" is re-added at the end.
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // 0020xxxxxxxxx -> 20xxxxxxxxx
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith(EG_CODE)) {
    // already international
  } else if (digits.startsWith("0")) {
    // local format 01xxxxxxxxx
    digits = EG_CODE + digits.slice(1);
  } else if (/^1\d{8,9}$/.test(digits)) {
    // mobile written without the leading zero
    digits = EG_CODE + digits;
  } else {
    // Another country code was supplied — leave it untouched.
    return `+${digits}`;
  }

  return `+${digits}`;
}

/** Digits only, ready for https://wa.me/<value>. */
export function whatsAppDigits(input: string): string {
  return normalizeEgyptWhatsApp(input).replace(/\D/g, "");
}
