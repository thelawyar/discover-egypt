import type { City, Governorate } from "@/lib/directory-types";

export type DetectedPlace = { city: string | null; governorate: string | null };

/** Strips Arabic diacritics/prefixes so "الجيزة" and "جيزة" match. */
function norm(v: string): string {
  return v
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^ال/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Browser geolocation → coordinates (rejects when denied or unsupported). */
export function getCoords(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("تعذّر الوصول للموقع، فعّل صلاحية الموقع وحاول مرة أخرى")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** Free keyless reverse geocoding in Arabic. */
export async function reverseGeocode(lat: number, lng: number): Promise<DetectedPlace> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
  );
  if (!res.ok) throw new Error("تعذّر تحديد المدينة من موقعك");
  const data = (await res.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
  };
  return {
    city: data.city || data.locality || null,
    governorate: data.principalSubdivision || null,
  };
}

/** Maps a detected place onto directory taxonomy slugs. */
export function matchPlace(
  place: DetectedPlace,
  taxonomy: { cities: City[]; governorates: Governorate[] },
): { gov: string; city: string; label: string } | null {
  const govName = place.governorate ? norm(place.governorate) : "";
  const cityName = place.city ? norm(place.city) : "";

  const gov =
    taxonomy.governorates.find((g) => norm(g.name) === govName) ??
    taxonomy.governorates.find(
      (g) => govName && (norm(g.name).includes(govName) || govName.includes(norm(g.name))),
    ) ??
    null;

  const pool = gov
    ? taxonomy.cities.filter((c) => c.governorate_id === gov.id)
    : taxonomy.cities;
  const city =
    pool.find((c) => norm(c.name) === cityName) ??
    pool.find(
      (c) =>
        cityName && (norm(c.name).includes(cityName) || cityName.includes(norm(c.name))),
    ) ??
    null;

  const owner = city
    ? taxonomy.governorates.find((g) => g.id === city.governorate_id)
    : gov;
  if (!city && !gov) return null;

  return {
    gov: owner?.slug ?? "",
    city: city?.slug ?? "",
    label: city ? `${city.name}${owner ? ` · ${owner.name}` : ""}` : (owner?.name ?? ""),
  };
}

/** One-shot: ask for location, reverse geocode, and match to taxonomy. */
export async function detectLocation(taxonomy: {
  cities: City[];
  governorates: Governorate[];
}) {
  const { lat, lng } = await getCoords();
  const place = await reverseGeocode(lat, lng);
  const match = matchPlace(place, taxonomy);
  if (!match) throw new Error("لم نتعرف على مدينتك ضمن المدن المتاحة");
  return match;
}
