import type { ProductSearchResult } from "./directory-types";

export function productSearchPrice(variants: { price: number; original_price: number | null; stock: number }[]): Pick<ProductSearchResult, "price" | "original_price" | "price_from" | "in_stock"> {
  const sorted = [...variants].sort((a, b) => Number(a.price) - Number(b.price));
  const cheapest = sorted[0];
  return {
    price: cheapest ? Number(cheapest.price) : null,
    original_price: cheapest?.original_price == null ? null : Number(cheapest.original_price),
    price_from: sorted.some((v) => Number(v.price) !== Number(cheapest?.price)),
    in_stock: variants.some((v) => v.stock > 0),
  };
}