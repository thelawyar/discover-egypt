/** Pure helpers for the mini online store (cart math + WhatsApp order text). */

export const PAYMENT_METHODS = {
  cod: "الدفع عند الاستلام",
  wallet: "محفظة إلكترونية (فودافون كاش وغيرها)",
  instapay: "إنستاباي InstaPay",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

/** The existing price is always the amount charged; original price is optional. */
export function validStorePrice(price: number, originalPrice: number | null): boolean {
  return Number.isFinite(price) && price >= 0 && (originalPrice === null ||
    (Number.isFinite(originalPrice) && originalPrice > 0 && originalPrice >= price));
}

export function discountPercent(price: number, originalPrice: number | null): number {
  if (!validStorePrice(price, originalPrice) || originalPrice === null || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export type CartLine = {
  variantId: string;
  productName: string;
  size: string | null;
  color: string | null;
  price: number;
  qty: number;
  stock: number;
};

export type ShippingChoice = { name: string; price: number };

export type Customer = {
  name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string;
};

/** Adds qty of a line, never exceeding available stock. */
export function addToCart(cart: CartLine[], line: CartLine): CartLine[] {
  const existing = cart.find((l) => l.variantId === line.variantId);
  if (existing) {
    return cart.map((l) =>
      l.variantId === line.variantId
        ? { ...l, qty: Math.min(l.stock, l.qty + line.qty) }
        : l,
    );
  }
  return [...cart, { ...line, qty: Math.min(line.stock, Math.max(1, line.qty)) }];
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function cartTotal(cart: CartLine[], shipping: ShippingChoice | null): number {
  return cartSubtotal(cart) + (shipping?.price ?? 0);
}

export function formatEGP(n: number): string {
  return `${Number(n.toFixed(2)).toLocaleString("en-US")} ج.م`;
}

export function variantLabel(size: string | null, color: string | null): string {
  return [size && `المقاس: ${size}`, color && `اللون: ${color}`].filter(Boolean).join(" • ");
}

/** Full order text sent from the customer's WhatsApp to the business. */
export function buildOrderMessage(input: {
  businessName: string;
  cart: CartLine[];
  shipping: ShippingChoice | null;
  payment: PaymentMethod;
  shippingPrepayRequired: boolean;
  customer: Customer;
  pageUrl?: string;
}): string {
  const { cart, shipping, customer } = input;
  const lines: string[] = [
    `🛒 طلب جديد من متجر ${input.businessName} على durtown.com`,
    "",
    "*المنتجات:*",
  ];
  cart.forEach((l, i) => {
    const v = variantLabel(l.size, l.color);
    lines.push(`${i + 1}. ${l.productName}${v ? ` (${v})` : ""} × ${l.qty} = ${formatEGP(l.price * l.qty)}`);
  });
  lines.push("", `المجموع: ${formatEGP(cartSubtotal(cart))}`);
  if (shipping) lines.push(`الشحن (${shipping.name}): ${formatEGP(shipping.price)}`);
  lines.push(`*الإجمالي: ${formatEGP(cartTotal(cart, shipping))}*`, "");
  lines.push(`طريقة الدفع: ${PAYMENT_METHODS[input.payment]}`);
  if (input.shippingPrepayRequired && shipping && shipping.price > 0) {
    lines.push(`⚠️ سيتم دفع قيمة الشحن (${formatEGP(shipping.price)}) مقدماً قبل الشحن`);
  }
  lines.push(
    "",
    "*بيانات الشحن:*",
    `الاسم: ${customer.name}`,
    `الموبايل: ${customer.phone}`,
    `العنوان: ${[customer.governorate, customer.city, customer.address].filter(Boolean).join(" - ")}`,
  );
  if (customer.notes?.trim()) lines.push(`ملاحظات: ${customer.notes.trim()}`);
  if (input.pageUrl) lines.push("", input.pageUrl);
  return lines.join("\n");
}
