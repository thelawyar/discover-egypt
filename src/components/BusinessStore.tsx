import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { whatsAppDigits } from "@/lib/phone";
import {
  PAYMENT_METHODS, addToCart, buildOrderMessage, cartSubtotal, cartTotal, discountPercent, formatEGP, variantLabel,
  type CartLine, type PaymentMethod,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Variant = { id: string; size: string | null; color: string | null; price: number; original_price: number | null; stock: number };
type Product = { id: string; name: string; description: string | null; image_url: string | null; store_variants: Variant[] };

/** Mini online store on the business page. Guests order via their own WhatsApp. */
export function BusinessStore(props: { businessId: string; businessName: string; whatsapp: string | null; username: string }) {
  const { businessId } = props;
  const { data } = useQuery({
    queryKey: ["public-store", businessId],
    queryFn: async () => {
      const [s, p, sh] = await Promise.all([
        supabase.from("store_settings").select("*").eq("business_id", businessId).maybeSingle(),
        supabase.from("store_products").select("id,name,description,image_url,store_variants(id,size,color,price,original_price,stock)")
          .eq("business_id", businessId).eq("is_active", true).order("sort_order").order("created_at"),
        supabase.from("store_shipping_methods").select("id,name,price,notes").eq("business_id", businessId).eq("is_active", true).order("price"),
      ]);
      for (const result of [s, p, sh]) if (result.error) throw result.error;
      return { settings: s.data, products: (p.data ?? []) as Product[], shipping: sh.data ?? [] };
    },
  });

  const storageKey = `durtown-cart-${businessId}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Product | null>(null);
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { /* ignore */ }
  }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(cart)); }, [cart, storageKey]);
  useEffect(() => {
    if (!data?.settings?.is_enabled || !props.whatsapp) return;
    function openLinkedProduct() {
      const id = window.location.hash.replace(/^#product-/, "");
      const product = data?.products.find((p) => p.id === id);
      if (product) {
        setPicked(product);
        document.getElementById(`product-${product.id}`)?.scrollIntoView({ block: "center" });
      }
    }
    openLinkedProduct();
    window.addEventListener("hashchange", openLinkedProduct);
    return () => window.removeEventListener("hashchange", openLinkedProduct);
  }, [data, props.whatsapp]);

  if (!data?.settings?.is_enabled || !data.products.length || !props.whatsapp) return null;
  const count = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold"><ShoppingBag className="size-4" /> المتجر</h2>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
          <ShoppingCart className="size-4" /> السلة {count ? `(${count})` : ""}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.products.map((p) => {
          const prices = p.store_variants.map((v) => Number(v.price));
          const inStock = p.store_variants.some((v) => v.stock > 0);
          const cheapest = [...p.store_variants].sort((a, b) => Number(a.price) - Number(b.price))[0];
          return (
            <Button key={p.id} id={`product-${p.id}`} type="button" variant="outline" onClick={() => setPicked(p)}
              className="block h-auto overflow-hidden whitespace-normal rounded-lg p-0 text-start">
              {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
                : <div className="flex aspect-square items-center justify-center bg-muted"><ShoppingBag className="size-8 opacity-40" /></div>}
              <div className="p-2.5">
                <p className="line-clamp-1 text-sm font-bold">{p.name}</p>
                {cheapest ? <StorePrice variant={cheapest} from={Math.min(...prices) !== Math.max(...prices)} /> : null}
                {!inStock ? <p className="text-xs text-destructive">نفدت الكمية</p> : null}
              </div>
            </Button>
          );
        })}
      </div>

      <ProductDialog product={picked} onClose={() => setPicked(null)}
        onAdd={(line) => { setCart((c) => addToCart(c, line)); setPicked(null); toast.success("تمت الإضافة إلى السلة"); }} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md" dir="rtl">
          <SheetHeader><SheetTitle>سلة {props.businessName}</SheetTitle></SheetHeader>
          <Checkout cart={cart} setCart={setCart} settings={data.settings} shipping={data.shipping}
            businessName={props.businessName} whatsapp={props.whatsapp} username={props.username}
            onDone={() => { setCart([]); setOpen(false); }} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StorePrice({ variant, from = false }: { variant: Variant; from?: boolean }) {
  const discount = discountPercent(Number(variant.price), variant.original_price == null ? null : Number(variant.original_price));
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
    <span className="font-bold">{from ? "من " : ""}{formatEGP(Number(variant.price))}</span>
    {discount > 0 ? <>
      <del className="text-muted-foreground">{formatEGP(Number(variant.original_price))}</del>
      <span className="rounded bg-success/15 px-1.5 py-0.5 font-bold text-success">خصم {discount}%</span>
    </> : null}
  </div>;
}

function ProductDialog({ product, onClose, onAdd }: { product: Product | null; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  useEffect(() => {
    setQty(1);
    setVariantId(product?.store_variants.find((v) => v.stock > 0)?.id ?? "");
  }, [product]);
  const v = product?.store_variants.find((x) => x.id === variantId);
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        {product ? (
          <>
            <DialogHeader><DialogTitle>{product.name}</DialogTitle></DialogHeader>
            {product.image_url ? <img src={product.image_url} alt={product.name} className="aspect-square w-full rounded-xl object-cover" /> : null}
            {product.description ? <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p> : null}
            <div className="flex flex-wrap gap-2">
              {product.store_variants.map((x) => (
                <Button key={x.id} type="button" variant={x.id === variantId ? "default" : "outline"} disabled={x.stock <= 0} onClick={() => { setVariantId(x.id); setQty(1); }}
                  className="h-auto whitespace-normal rounded-full px-3 py-1.5 text-xs disabled:opacity-40">
                  {variantLabel(x.size, x.color) || "عادي"} — {formatEGP(Number(x.price))}{x.stock <= 0 ? " (نفد)" : ""}
                </Button>
              ))}
            </div>
            {v ? <StorePrice variant={v} /> : null}
            {v ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="size-4" /></Button>
                  <span className="w-8 text-center font-bold">{qty}</span>
                  <Button size="icon" variant="outline" onClick={() => setQty((q) => Math.min(v.stock, q + 1))}><Plus className="size-4" /></Button>
                </div>
                <span className="text-xs text-muted-foreground">متاح: {v.stock}</span>
              </div>
            ) : null}
            <Button disabled={!v} className="rounded-full" onClick={() => v && onAdd({
              variantId: v.id, productName: product.name, size: v.size, color: v.color, price: Number(v.price), qty, stock: v.stock,
            })}>
              <ShoppingCart className="size-4" /> أضف إلى السلة {v ? `• ${formatEGP(Number(v.price) * qty)}` : ""}
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type Settings = { payment_methods: string[]; wallet_number: string | null; instapay_handle: string | null; shipping_prepay_required: boolean; notes: string | null };

function Checkout(props: {
  cart: CartLine[]; setCart: (f: (c: CartLine[]) => CartLine[]) => void; settings: Settings;
  shipping: { id: string; name: string; price: number; notes: string | null }[];
  businessName: string; whatsapp: string; username: string; onDone: () => void;
}) {
  const { cart, setCart, settings } = props;
  const methods = settings.payment_methods.filter((m): m is PaymentMethod => m in PAYMENT_METHODS);
  const [shipId, setShipId] = useState(props.shipping[0]?.id ?? "");
  const [payment, setPayment] = useState<PaymentMethod>(methods[0] ?? "cod");
  const [c, setC] = useState({ name: "", phone: "", governorate: "", city: "", address: "", notes: "" });
  const ship = props.shipping.find((s) => s.id === shipId);
  const shipping = ship ? { name: ship.name, price: Number(ship.price) } : null;
  const total = useMemo(() => cartTotal(cart, shipping), [cart, shipping]);

  if (!cart.length) return <p className="py-10 text-center text-sm text-muted-foreground">السلة فارغة</p>;

  const submit = () => {
    if (!c.name.trim() || !c.phone.trim() || !c.address.trim()) return toast.error("أكمل الاسم ورقم الموبايل والعنوان");
    if (props.shipping.length && !shipping) return toast.error("اختر طريقة الشحن");
    const msg = buildOrderMessage({
      businessName: props.businessName, cart, shipping, payment,
      shippingPrepayRequired: settings.shipping_prepay_required, customer: c,
      pageUrl: `${window.location.origin}/${props.username}`,
    });
    window.open(`https://wa.me/${whatsAppDigits(props.whatsapp)}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    props.onDone();
  };

  return (
    <div className="mt-4 space-y-5 px-1 pb-6">
      <div className="space-y-2">
        {cart.map((l) => (
          <div key={l.variantId} className="flex items-center gap-2 rounded-xl border p-2.5 text-sm">
            <div className="flex-1">
              <p className="font-bold">{l.productName}</p>
              <p className="text-xs text-muted-foreground">{variantLabel(l.size, l.color)} {formatEGP(l.price)}</p>
            </div>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => setCart((cc) => cc.map((x) => x.variantId === l.variantId ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}><Minus className="size-3" /></Button>
            <span className="w-5 text-center">{l.qty}</span>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => setCart((cc) => cc.map((x) => x.variantId === l.variantId ? { ...x, qty: Math.min(x.stock, x.qty + 1) } : x))}><Plus className="size-3" /></Button>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => setCart((cc) => cc.filter((x) => x.variantId !== l.variantId))}><Trash2 className="size-3" /></Button>
          </div>
        ))}
      </div>

      {props.shipping.length ? (
        <div>
          <p className="mb-2 text-sm font-bold">طريقة الشحن</p>
          <div className="space-y-1.5">
            {props.shipping.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
                <input type="radio" name="ship" checked={shipId === s.id} onChange={() => setShipId(s.id)} />
                <span className="flex-1">{s.name}{s.notes ? <span className="block text-xs text-muted-foreground">{s.notes}</span> : null}</span>
                <span>{formatEGP(Number(s.price))}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-bold">طريقة الدفع</p>
        <div className="space-y-1.5">
          {methods.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
              <input type="radio" name="pay" checked={payment === m} onChange={() => setPayment(m)} />
              <span className="flex-1">{PAYMENT_METHODS[m]}
                {m === "wallet" && settings.wallet_number ? <span className="block text-xs text-muted-foreground" dir="ltr">{settings.wallet_number}</span> : null}
                {m === "instapay" && settings.instapay_handle ? <span className="block text-xs text-muted-foreground" dir="ltr">{settings.instapay_handle}</span> : null}
              </span>
            </label>
          ))}
        </div>
        {settings.shipping_prepay_required ? <p className="mt-2 rounded-lg bg-muted p-2 text-xs">يشترط المتجر دفع قيمة الشحن مقدماً قبل شحن الطلب.</p> : null}
        {settings.notes ? <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{settings.notes}</p> : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold">بيانات الشحن</p>
        <Input placeholder="الاسم" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <Input placeholder="رقم الموبايل" dir="ltr" inputMode="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="المحافظة" value={c.governorate} onChange={(e) => setC({ ...c, governorate: e.target.value })} />
          <Input placeholder="المدينة / المنطقة" value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} />
        </div>
        <Textarea placeholder="العنوان بالتفصيل" rows={2} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} />
        <Input placeholder="ملاحظات (اختياري)" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
      </div>

      <div className="space-y-1 rounded-xl bg-muted/60 p-3 text-sm">
        <div className="flex justify-between"><span>المنتجات</span><span>{formatEGP(cartSubtotal(cart))}</span></div>
        {shipping ? <div className="flex justify-between"><span>الشحن</span><span>{formatEGP(shipping.price)}</span></div> : null}
        <div className="flex justify-between font-bold"><span>الإجمالي</span><span>{formatEGP(total)}</span></div>
      </div>
      <Button className="w-full rounded-full" size="lg" onClick={submit}>تأكيد الطلب وإرساله عبر واتساب</Button>
    </div>
  );
}
