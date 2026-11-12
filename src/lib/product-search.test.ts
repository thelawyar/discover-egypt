import { describe, expect, it } from "vitest";
import { productSearchPrice } from "./product-search";

describe("product search pricing", () => {
  it("pairs comparison price with the cheapest variant and keeps sale price", () => {
    expect(productSearchPrice([
      { price: 300, original_price: 400, stock: 2 },
      { price: 150, original_price: 200, stock: 3 },
    ])).toEqual({ price: 150, original_price: 200, price_from: true, in_stock: true });
  });
  it("marks products without stock unavailable", () => {
    expect(productSearchPrice([{ price: 150, original_price: null, stock: 0 }]).in_stock).toBe(false);
  });
  it("does not invent a price for a product without variants", () => {
    expect(productSearchPrice([]).price).toBeNull();
  });
});