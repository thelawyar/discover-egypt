export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
export const NUMBER_SIZES = Array.from({ length: 18 }, (_, i) => String(26 + i * 2));

export function expandSizeSelections<T extends { id?: string; sizes: string[] }>(rows: T[]) {
  return rows.flatMap(({ sizes, id, ...row }) =>
    (sizes.length ? [...new Set(sizes)] : [""]).map((size, index) => ({
      ...row,
      size,
      ...(id && index === 0 ? { id } : {}),
    })),
  );
}