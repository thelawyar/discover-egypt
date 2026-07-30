import type { City, Governorate } from "./directory-types";

/** Cities that belong to the selected governorate (all when none selected). */
export function citiesForGovernorate(
  cities: City[],
  governorateId: string | null | undefined,
): City[] {
  if (!governorateId) return cities;
  return cities.filter((c) => c.governorate_id === governorateId);
}

/** True when the city exists and belongs to the given governorate. */
export function cityBelongsToGovernorate(
  cities: City[],
  cityId: string,
  governorateId: string,
): boolean {
  const city = cities.find((c) => c.id === cityId);
  return Boolean(city && city.governorate_id === governorateId);
}

export const CITY_MISMATCH_MESSAGE =
  "المدينة المختارة لا تتبع المحافظة المحددة. اختر مدينة من مدن المحافظة.";

/** Filter helper for a city search box. */
export function filterCitiesByTerm(cities: City[], term: string): City[] {
  const value = term.trim();
  if (!value) return cities;
  return cities.filter((c) => c.name.includes(value) || c.slug.includes(value));
}

/** Keeps gov/city search params consistent: an orphan city slug is dropped. */
export function normalizeLocationParams(
  taxonomy: { cities: City[]; governorates: Governorate[] },
  params: { gov: string; city: string },
): { gov: string; city: string } {
  const gov = taxonomy.governorates.find((g) => g.slug === params.gov);
  const city = taxonomy.cities.find((c) => c.slug === params.city);
  if (!city) return { gov: gov?.slug ?? "", city: "" };
  if (gov && city.governorate_id !== gov.id) return { gov: gov.slug, city: "" };
  if (!gov) {
    const owner = taxonomy.governorates.find((g) => g.id === city.governorate_id);
    return { gov: owner?.slug ?? "", city: city.slug };
  }
  return { gov: gov.slug, city: city.slug };
}
