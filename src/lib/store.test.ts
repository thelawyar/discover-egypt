import { describe, expect, it } from "vitest";
import { addToCart, buildOrderMessage, cartTotal, discountPercent, validStorePrice, type CartLine } from "./store";

const line: CartLine = { variantId: "v1", productName: "تيشيرت", size: "L", color: "أسود", price: 200, qty: 2, stock: 3 };

describe("store rules", () => {
  it("calculates the percentage from before and after discount prices", () => {
    expect(discountPercent(150, 200)).toBe(25);
    expect(discountPercent(199, 300)).toBe(34);
  });

  it("keeps products without discounts at their existing price", () => {
    expect(discountPercent(200, null)).toBe(0);
    expect(discountPercent(200, 200)).toBe(0);
    expect(validStorePrice(200, null)).toBe(true);
  });

  it("rejects a final price greater than the original price", () => {
    expect(validStorePrice(201, 200)).toBe(false);
    expect(validStorePrice(-1, 200)).toBe(false);
    expect(validStorePrice(150, 0)).toBe(false);
  });

  it("charges the discounted price in the cart including shipping", () => {
    expect(cartTotal([{ ...line, price: 150 }], { name: "القاهرة", price: 50 })).toBe(350);
  });
  it("never puts more than the available stock in the cart", () => {
    const cart = addToCart(addToCart([], line), line);
    expect(cart[0].qty).toBe(3);
  });

  it("total includes the shipping price", () => {
    expect(cartTotal([line], { name: "القاهرة", price: 50 })).toBe(450);
  });

  it("order message warns when shipping must be paid first", () => {
    const msg = buildOrderMessage({
      businessName: "متجر", cart: [line], shipping: { name: "القاهرة", price: 50 },
      payment: "cod", shippingPrepayRequired: true,
      customer: { name: "أحمد", phone: "010", governorate: "القاهرة", city: "مدينة نصر", address: "شارع 1" },
    });
    expect(msg).toContain("مقدماً قبل الشحن");
    expect(msg).toContain("450");
  });
});
