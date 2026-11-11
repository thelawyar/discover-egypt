import { describe, expect, it } from "vitest";
import { addToCart, buildOrderMessage, cartTotal, type CartLine } from "./store";

const line: CartLine = { variantId: "v1", productName: "تيشيرت", size: "L", color: "أسود", price: 200, qty: 2, stock: 3 };

describe("store rules", () => {
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
