import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadBusinessImage } from "@/lib/upload-business-image";
import { PAYMENT_METHODS, discountPercent, validStorePrice, type PaymentMethod } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type Variant = { id?: string; size: string; color: string; price: string; originalPrice: string; stock: string };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border bg-card p-4 sm:p-5">
    <h3 className="mb-4 text-base font-bold">{title}</h3>
    {children}
  </section>
);

export function StoreEditor({ businessId, userId }: { businessId: string; userId: string }) {
  return (
    <div className="space-y-4" dir="rtl">
      <SettingsSection businessId={businessId} />
      <ShippingSection businessId={businessId} />
      <ProductsSection businessId={businessId} userId={userId} />
    </div>
  );
}

function SettingsSection({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["store-settings", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").eq("business_id", businessId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({
    is_enabled: false,
    payment_methods: ["cod"] as string[],
    wallet_number: "",
    instapay_handle: "",
    shipping_prepay_required: false,
    notes: "",
  });
  useEffect(() => {
    if (data)
      setForm({
        is_enabled: data.is_enabled,
        payment_methods: data.payment_methods,
        wallet_number: data.wallet_number ?? "",
        instapay_handle: data.instapay_handle ?? "",
        shipping_prepay_required: data.shipping_prepay_required,
        notes: data.notes ?? "",
      });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.payment_methods.length) throw new Error("اختر طريقة دفع واحدة على الأقل");
      const { error } = await supabase.from("store_settings").upsert({
        business_id: businessId,
        ...form,
        wallet_number: form.wallet_number.trim() || null,
        instapay_handle: form.instapay_handle.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المتجر");
      qc.invalidateQueries({ queryKey: ["store-settings", businessId] });
      qc.invalidateQueries({ queryKey: ["public-store", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMethod = (m: string, on: boolean) =>
    setForm((f) => ({ ...f, payment_methods: on ? [...new Set([...f.payment_methods, m])] : f.payment_methods.filter((x) => x !== m) }));

  return (
    <Section title="إعدادات المتجر والدفع">
      <label className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
        <span className="text-sm font-medium">تفعيل المتجر وظهوره في صفحة النشاط</span>
        <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
      </label>
      <p className="mb-2 text-sm font-medium">طرق الدفع المتاحة</p>
      <div className="mb-4 space-y-2">
        {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.payment_methods.includes(m)} onCheckedChange={(v) => toggleMethod(m, v === true)} />
            {PAYMENT_METHODS[m]}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {form.payment_methods.includes("wallet") ? (
          <Input placeholder="رقم المحفظة" dir="ltr" value={form.wallet_number} onChange={(e) => setForm({ ...form, wallet_number: e.target.value })} />
        ) : null}
        {form.payment_methods.includes("instapay") ? (
          <Input placeholder="عنوان إنستاباي (مثال: name@instapay)" dir="ltr" value={form.instapay_handle} onChange={(e) => setForm({ ...form, instapay_handle: e.target.value })} />
        ) : null}
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
        <span className="text-sm">اشتراط دفع قيمة الشحن مقدماً قبل شحن الطلب</span>
        <Switch checked={form.shipping_prepay_required} onCheckedChange={(v) => setForm({ ...form, shipping_prepay_required: v })} />
      </label>
      <Textarea className="mt-3" placeholder="ملاحظات للعملاء (سياسة الاستبدال، مدة التوصيل...)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button className="mt-4 rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>حفظ الإعدادات</Button>
    </Section>
  );
}

function ShippingSection({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const key = ["store-shipping", businessId];
  const [draft, setDraft] = useState({ name: "", price: "", notes: "" });
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("store_shipping_methods").select("*").eq("business_id", businessId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["public-store", businessId] });
  };
  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("اكتب اسم طريقة الشحن أو المنطقة");
      const { error } = await supabase.from("store_shipping_methods").insert({
        business_id: businessId, name: draft.name.trim(), price: Number(draft.price) || 0, notes: draft.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setDraft({ name: "", price: "", notes: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = async (id: string) => { await supabase.from("store_shipping_methods").delete().eq("id", id); refresh(); };
  const toggle = async (id: string, v: boolean) => { await supabase.from("store_shipping_methods").update({ is_active: v }).eq("id", id); refresh(); };

  return (
    <Section title="طرق وأسعار الشحن">
      <div className="space-y-2">
        {data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <div className="flex-1">
              <p className="font-medium">{s.name} — {Number(s.price)} ج.م</p>
              {s.notes ? <p className="text-xs text-muted-foreground">{s.notes}</p> : null}
            </div>
            <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
            <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label="حذف"><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {!data?.length ? <p className="text-sm text-muted-foreground">لم تُضف طرق شحن بعد. مثال: «داخل المدينة» أو «باقي المحافظات».</p> : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
        <Input placeholder="الاسم / المنطقة" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <Input placeholder="السعر" type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        <Input placeholder="ملاحظة (مدة التوصيل)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="size-4" /> إضافة</Button>
      </div>
    </Section>
  );
}

const EMPTY_VARIANT: Variant = { size: "", color: "", price: "", originalPrice: "", stock: "" };

function ProductsSection({ businessId, userId }: { businessId: string; userId: string }) {
  const qc = useQueryClient();
  const key = ["store-products-admin", businessId];
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const finish = () => {
    setEditing(null);
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["public-store", businessId] });
  };
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("*, store_variants(*)")
        .eq("business_id", businessId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Section title="المنتجات">
      <div className="space-y-2">
        {data?.map((p) =>
          editing === p.id ? (
            <ProductForm key={p.id} businessId={businessId} userId={userId} product={p} onDone={finish} />
          ) : (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3">
              {p.image_url ? <img src={p.image_url} alt="" className="size-14 rounded-lg object-cover" /> : <div className="size-14 rounded-lg bg-muted" />}
              <div className="flex-1 text-sm">
                <p className="font-bold">{p.name} {!p.is_active ? <span className="text-xs text-muted-foreground">(مخفي)</span> : null}</p>
                <p className="text-xs text-muted-foreground">
                  {p.store_variants.length} اختيار • المخزون: {p.store_variants.reduce((s, v) => s + v.stock, 0)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>تعديل</Button>
            </div>
          ),
        )}
        {!data?.length && editing !== "new" ? <p className="text-sm text-muted-foreground">لا توجد منتجات بعد.</p> : null}
      </div>
      {editing === "new" ? (
        <div className="mt-3"><ProductForm businessId={businessId} userId={userId} onDone={finish} /></div>
      ) : (
        <Button className="mt-4 rounded-full" onClick={() => setEditing("new")}><Plus className="size-4" /> منتج جديد</Button>
      )}
    </Section>
  );
}

type ProductRow = {
  id: string; name: string; description: string | null; image_url: string | null; is_active: boolean;
  store_variants: { id: string; size: string | null; color: string | null; price: number; original_price: number | null; stock: number }[];
};

function ProductForm({ businessId, userId, product, onDone }: { businessId: string; userId: string; product?: ProductRow; onDone: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>(
    product?.store_variants.length
      ? product.store_variants.map((v) => ({ id: v.id, size: v.size ?? "", color: v.color ?? "", price: String(v.price), originalPrice: v.original_price == null ? "" : String(v.original_price), stock: String(v.stock) }))
      : [{ ...EMPTY_VARIANT }],
  );

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const r = await uploadBusinessImage(file, userId, { maxWidth: 1000, thumbWidth: 400, crop: true, ratio: 1 });
      setImageUrl(r.url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("اكتب اسم المنتج");
      const rows = variants.filter((v) => v.price !== "");
      if (!rows.length) throw new Error("أضف سعراً لاختيار واحد على الأقل");
      for (const v of rows) {
        if (!validStorePrice(Number(v.price), v.originalPrice === "" ? null : Number(v.originalPrice)))
          throw new Error("السعر قبل الخصم يجب أن يكون أكبر من أو يساوي السعر بعد الخصم، والأسعار لا تكون سالبة");
      }
      const payload = { business_id: businessId, name: name.trim(), description: description.trim() || null, image_url: imageUrl || null, is_active: isActive };
      let productId = product?.id;
      if (productId) {
        const { error } = await supabase.from("store_products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("store_products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }
      const keepIds = rows.flatMap((v) => v.id ? [v.id] : []);
      const removed = (product?.store_variants ?? []).filter((v) => !keepIds.includes(v.id)).map((v) => v.id);
      if (removed.length) {
        const { error } = await supabase.from("store_variants").delete().in("id", removed);
        if (error) throw error;
      }
      for (const v of rows) {
        const row = {
          product_id: productId, business_id: businessId,
          size: v.size.trim() || null, color: v.color.trim() || null,
          price: Math.max(0, Number(v.price) || 0), stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
          original_price: v.originalPrice === "" ? null : Number(v.originalPrice),
        };
        const { error } = v.id
          ? await supabase.from("store_variants").update(row).eq("id", v.id)
          : await supabase.from("store_variants").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("تم حفظ المنتج"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = async () => {
    if (!product || !confirm("حذف هذا المنتج نهائياً؟")) return;
    await supabase.from("store_products").delete().eq("id", product.id);
    onDone();
  };

  const setV = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-3 rounded-xl border-2 border-primary/30 p-4">
      <div className="flex gap-3">
        <label className="flex size-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <div className="flex-1 space-y-2">
          <Input placeholder="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="وصف مختصر" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <p className="text-sm font-medium">المقاسات والألوان والأسعار والكميات</p>
      <div className="space-y-2">
        {variants.map((v, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3">
            <Input placeholder="المقاس (اختياري)" value={v.size} onChange={(e) => setV(i, { size: e.target.value })} />
            <Input placeholder="اللون (اختياري)" value={v.color} onChange={(e) => setV(i, { color: e.target.value })} />
            <label className="space-y-1 text-xs">السعر قبل الخصم (اختياري)
              <Input aria-label="السعر قبل الخصم" placeholder="بدون خصم" type="number" min={0} step="0.01" value={v.originalPrice} onChange={(e) => setV(i, { originalPrice: e.target.value })} />
            </label>
            <label className="space-y-1 text-xs">السعر بعد الخصم / سعر البيع
              <Input aria-label="السعر بعد الخصم" placeholder="سعر البيع" type="number" min={0} step="0.01" value={v.price} onChange={(e) => setV(i, { price: e.target.value })} />
            </label>
            <Input placeholder="الكمية" type="number" min={0} value={v.stock} onChange={(e) => setV(i, { stock: e.target.value })} />
            <Button size="icon" variant="ghost" disabled={variants.length === 1} onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label="حذف"><Trash2 className="size-4" /></Button>
            {v.price !== "" && v.originalPrice !== "" && discountPercent(Number(v.price), Number(v.originalPrice)) > 0 ?
              <p className="col-span-2 text-xs font-bold text-success">خصم {discountPercent(Number(v.price), Number(v.originalPrice))}%</p> : null}
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => setVariants((vs) => [...vs, { ...EMPTY_VARIANT }])}><Plus className="size-4" /> إضافة مقاس/لون</Button>
      <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setIsActive} /> ظاهر في المتجر</label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>حفظ المنتج</Button>
        <Button variant="ghost" onClick={onDone}>إلغاء</Button>
        {product ? <Button variant="ghost" className="text-destructive" onClick={del}>حذف</Button> : null}
      </div>
    </div>
  );
}
