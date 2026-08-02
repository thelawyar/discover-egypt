import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTaxonomy } from "@/lib/directory.functions";
import { CityPicker } from "@/components/CityPicker";
import {
  citiesForGovernorate,
  cityBelongsToGovernorate,
  CITY_MISMATCH_MESSAGE,
} from "@/lib/location-filter";
import {
  isValidWhatsApp,
  normalizeEgyptWhatsApp,
  whatsAppPreview,
} from "@/lib/phone";
import { buildCoverVariants } from "@/lib/image-optimize";
import { useAuth } from "@/hooks/useAuth";
import { normalizeUsername, validateUsername, USERNAME_HINT } from "@/lib/username";
import { isHexColor } from "@/lib/business-theme";
import { ATTR_GROUPS, PRICE_LEVELS } from "@/lib/business-attributes";

import { ThemeEditor } from "@/components/dashboard/ThemeEditor";
import { GalleryEditor } from "@/components/dashboard/GalleryEditor";
import { HoursEditor, DEFAULT_HOURS, type DayRow } from "@/components/dashboard/HoursEditor";
import { BusinessStats } from "@/components/dashboard/BusinessStats";
import { ManagersEditor } from "@/components/dashboard/ManagersEditor";
import { QrCodeButton } from "@/components/QrCodeButton";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dashboard/business/$id")({
  head: () => ({
    meta: [
      { title: "بيانات النشاط | اكتشف مدينتك" },
      { name: "description", content: "أضف أو عدّل بيانات نشاطك التجاري." },
      { property: "og:title", content: "بيانات النشاط | اكتشف مدينتك" },
      { property: "og:description", content: "أضف أو عدّل بيانات نشاطك التجاري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusinessForm,
});

const schema = z.object({
  name: z.string().trim().min(2, "اسم النشاط مطلوب").max(120),
  description: z.string().trim().max(2000).optional(),
  category_id: z.string().uuid({ message: "اختر التصنيف" }),
  governorate_id: z.string().uuid({ message: "اختر المحافظة" }),
  city_id: z.string().uuid({ message: "اختر المدينة" }),
  address: z.string().trim().max(250).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || isValidWhatsApp(v), {
      message:
        "رقم واتساب غير صحيح. اكتب رقماً مصرياً مثل 01012345678 أو رقماً دولياً كاملاً بمفتاح الدولة.",
    }),
  email: z.string().trim().max(255).optional(),
  website: z.string().trim().max(255).optional(),
  facebook: z.string().trim().max(255).optional(),
  instagram: z.string().trim().max(255).optional(),
});

type FormState = {
  name: string;
  username: string;
  description: string;
  category_id: string;
  governorate_id: string;
  city_id: string;
  address: string;
  phone: string;
  whatsapp: string;
  cover_thumb_url: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  products: string[];
  cover_image_url: string | null;
  logo_url: string | null;
  theme_primary: string | null;
  theme_bg: string | null;
  theme_style: string;
  theme_font: string;
  theme_button: string;
  theme_contrast: boolean;
  price_level: number | null;
  amenities: string[];
  payment_methods: string[];
  good_for: string[];
  vibes: string[];
  occasions: string[];
};

const EMPTY: FormState = {
  name: "",
  username: "",
  description: "",
  category_id: "",
  governorate_id: "",
  city_id: "",
  address: "",
  phone: "",
  whatsapp: "",
  cover_thumb_url: "",
  email: "",
  website: "",
  facebook: "",
  instagram: "",
  products: [],
  cover_image_url: null,
  logo_url: null,
  theme_primary: null,
  theme_bg: null,
  theme_style: "classic",
  theme_font: "cairo",
  theme_button: "rounded",
  theme_contrast: false,
  price_level: null,
  amenities: [],
  payment_methods: [],
  good_for: [],
  vibes: [],
  occasions: [],
};


function BusinessForm() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  // Gallery + hours collected locally while creating a brand-new business.
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [draftHours, setDraftHours] = useState<DayRow[]>(DEFAULT_HOURS);
  const [productInput, setProductInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);


  const { data: taxonomy } = useQuery({
    queryKey: ["taxonomy"],
    queryFn: () => getTaxonomy(),
    staleTime: 1000 * 60 * 30,
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const value = newCategory.trim().slice(0, 60);
      if (value.length < 2) throw new Error("اسم التصنيف قصير جداً");
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: value,
          slug: "",
          status: isAdmin ? "approved" : "pending",
        })
        .select("id,status")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setNewCategory("");
      setShowCategoryInput(false);
      if (data.status === "approved") {
        queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
        set("category_id", data.id);
        toast.success("تمت إضافة التصنيف");
      } else {
        toast.success("تم إرسال التصنيف المقترح لمراجعة الإدارة");
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّر إضافة التصنيف"),
  });


  const { data: existing } = useQuery({
    queryKey: ["business-edit", id],
    enabled: !isNew && Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://durtown.com";

  const { data: history } = useQuery({
    queryKey: ["username-history", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_username_history")
        .select("id,username,created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name ?? "",
      username: existing.username ?? "",
      description: existing.description ?? "",
      category_id: existing.category_id ?? "",
      governorate_id: existing.governorate_id ?? "",
      city_id: existing.city_id ?? "",
      address: existing.address ?? "",
      phone: existing.phone ?? "",
      whatsapp: existing.whatsapp ?? "",
      cover_thumb_url: (existing as { cover_thumb_url?: string | null }).cover_thumb_url ?? "",
      email: existing.email ?? "",
      website: existing.website ?? "",
      facebook: existing.facebook ?? "",
      instagram: existing.instagram ?? "",
      products: existing.products ?? [],
      cover_image_url: existing.cover_image_url ?? null,
      logo_url: existing.logo_url ?? null,
      theme_primary: existing.theme_primary ?? null,
      theme_bg: existing.theme_bg ?? null,
      theme_style: existing.theme_style ?? "classic",
      theme_font: existing.theme_font ?? "cairo",
      theme_button: existing.theme_button ?? "rounded",
      theme_contrast: Boolean(existing.theme_contrast),
      price_level: existing.price_level ?? null,
      amenities: existing.amenities ?? [],
      payment_methods: existing.payment_methods ?? [],
      good_for: existing.good_for ?? [],
      vibes: existing.vibes ?? [],
      occasions: existing.occasions ?? [],
    });

  }, [existing]);

  const cities = citiesForGovernorate(
    taxonomy?.cities ?? [],
    form.governorate_id || null,
  );

  // Drop a stale city whenever it no longer belongs to the selected governorate.
  useEffect(() => {
    if (!form.city_id || !form.governorate_id) return;
    const list = taxonomy?.cities ?? [];
    if (!list.length) return;
    if (!cityBelongsToGovernorate(list, form.city_id, form.governorate_id)) {
      setForm((prev) => ({ ...prev, city_id: "" }));
    }
  }, [form.city_id, form.governorate_id, taxonomy?.cities]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadCover(file: File) {
    if (!user) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast.error("الصيغ المدعومة: PNG أو JPG أو WEBP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 10 ميجابايت");
      return;
    }
    setUploading(true);
    try {
      const { large, thumb } = await buildCoverVariants(file);
      const base = `${user.id}/${crypto.randomUUID()}`;

      const upload = async (variant: typeof large, suffix: string) => {
        const path = `${base}-${suffix}.${variant.ext}`;
        const { error } = await supabase.storage
          .from("business-images")
          .upload(path, variant.blob, {
            upsert: false,
            contentType: variant.contentType,
            cacheControl: "31536000",
          });
        if (error) throw error;
        return path;
      };

      const [largePath, thumbPath] = await Promise.all([
        upload(large, "1200"),
        upload(thumb, "600"),
      ]);

      const { data: signed, error: signError } = await supabase.storage
        .from("business-images")
        .createSignedUrls([largePath, thumbPath], 60 * 60 * 24 * 365);
      if (signError) throw signError;
      const signedLarge = signed.find((s) => s.path === largePath)?.signedUrl;
      const signedThumb = signed.find((s) => s.path === thumbPath)?.signedUrl;
      if (!signedLarge) throw new Error("sign_failed");
      set("cover_image_url", signedLarge);
      set("cover_thumb_url", signedThumb ?? "");
      const saved = Math.max(0, Math.round((1 - large.blob.size / file.size) * 100));
      toast.success(`تم رفع الصورة بعد ضغطها (توفير ${saved}% من الحجم)`);
    } catch {
      toast.error("تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }


  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      const allCities = taxonomy?.cities ?? [];
      if (
        allCities.length &&
        !cityBelongsToGovernorate(
          allCities,
          parsed.data.city_id,
          parsed.data.governorate_id,
        )
      ) {
        throw new Error(CITY_MISMATCH_MESSAGE);
      }

      const handle = form.username.trim();
      if (handle) {
        const handleError = validateUsername(handle);
        if (handleError) throw new Error(handleError);
      }

      if (form.theme_primary && !isHexColor(form.theme_primary))
        throw new Error("اللون الأساسي يجب أن يكون بصيغة #RRGGBB");
      if (form.theme_bg && !isHexColor(form.theme_bg))
        throw new Error("لون الخلفية يجب أن يكون بصيغة #RRGGBB");

      const payload = {
        ...parsed.data,
        ...(handle ? { username: normalizeUsername(handle) } : {}),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: normalizeEgyptWhatsApp(form.whatsapp) || null,
        cover_thumb_url: form.cover_thumb_url.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        facebook: form.facebook.trim() || null,
        instagram: form.instagram.trim() || null,
        products: form.products,
        cover_image_url: form.cover_image_url,
        logo_url: form.logo_url,
        theme_primary: form.theme_primary,
        theme_bg: form.theme_bg,
        theme_style: form.theme_style,
        theme_font: form.theme_font,
        theme_button: form.theme_button,
        theme_contrast: form.theme_contrast,
        price_level: form.price_level,
        amenities: form.amenities,
        payment_methods: form.payment_methods,
        good_for: form.good_for,
        vibes: form.vibes,
        occasions: form.occasions,

        // Ownership is set only when creating; editors/managers must not steal it.
        ...(isNew ? { owner_id: user!.id } : {}),
      };

      if (isNew) {
        const { data: created, error } = await supabase
          .from("businesses")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          if (error.code === "23505")
            throw new Error("هذا الرابط مستخدم بالفعل، جرّب رابطًا آخر.");
          throw error;
        }
        // Persist the gallery + hours collected before the business existed.
        if (created?.id) {
          if (draftImages.length) {
            await supabase.from("business_images").insert(
              draftImages.map((url, i) => ({
                business_id: created.id,
                url,
                sort_order: i,
              })),
            );
          }
          await supabase.from("business_hours").insert(
            draftHours.map((r) => ({
              business_id: created.id,
              day_of_week: r.day_of_week,
              opens_at: r.is_closed ? null : r.opens_at,
              closes_at: r.is_closed ? null : r.closes_at,
              is_closed: r.is_closed,
            })),
          );
        }
      } else {

        const { error } = await supabase
          .from("businesses")
          .update(payload)
          .eq("id", id);
        if (error) {
          if (error.code === "23505")
            throw new Error("هذا الرابط مستخدم بالفعل، جرّب رابطًا آخر.");
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("تم الحفظ. النشاط الآن قيد مراجعة الإدارة.");
      queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
      navigate({ to: "/dashboard" });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّر الحفظ"),
  });

  function addProduct() {
    const value = productInput.trim().slice(0, 60);
    if (!value || form.products.includes(value) || form.products.length >= 20) return;
    set("products", [...form.products, value]);
    setProductInput("");
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowRight className="size-3.5" /> رجوع إلى أنشطتي
        </Link>

        <h1 className="text-xl font-extrabold">
          {isNew ? "إضافة نشاط جديد" : "تعديل النشاط"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          سيتم إرسال البيانات للمراجعة قبل نشرها في الدليل.
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="space-y-1.5">
              <Label htmlFor="name">اسم النشاط *</Label>
              <Input
                id="name"
                value={form.name}
                maxLength={120}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            {!isNew ? (
              <div className="space-y-1.5">
                <Label htmlFor="username">الرابط الخاص بالنشاط</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {typeof window !== "undefined"
                      ? window.location.host.replace(/^www\./, "")
                      : "durtown.com"}
                    /
                  </span>
                  <input
                    id="username"
                    dir="ltr"
                    value={form.username}
                    maxLength={32}
                    onChange={(e) => set("username", normalizeUsername(e.target.value))}
                    className="h-9 flex-1 bg-transparent text-sm outline-none"
                    placeholder="my-shop"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {USERNAME_HINT} يمكنك استخدام هذا الرابط في كروت العمل وصفحات
                  التواصل الاجتماعي.
                </p>
                {existing?.username ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      <a
                        href={`/${existing.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" /> فتح الصفحة
                      </a>
                    </Button>
                    <QrCodeButton
                      url={`${siteOrigin}/${existing.username}`}
                      fileName={existing.username}
                    />
                  </div>
                ) : null}
                {history?.length ? (
                  <div className="rounded-lg bg-muted p-2.5">
                    <p className="text-[11px] font-bold">
                      سجل الروابط السابقة (تحوّل تلقائياً 301 للرابط الحالي)
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {history.map((h) => (
                        <li
                          key={h.id}
                          className="flex justify-between gap-2 text-[11px] text-muted-foreground"
                        >
                          <span dir="ltr">/{h.username}</span>
                          <span>
                            {new Date(h.created_at).toLocaleDateString("ar-EG")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="description">وصف النشاط</Label>
              <Textarea
                id="description"
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="اكتب نبذة عن نشاطك وما يقدمه..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>التصنيف *</Label>
                <select
                  value={form.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">اختر</option>
                  {(taxonomy?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {showCategoryInput ? (
                  <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2">
                    <Input
                      value={newCategory}
                      maxLength={60}
                      placeholder="اسم التصنيف الجديد"
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCategory.mutate();
                        }
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {isAdmin
                        ? "سيُضاف التصنيف مباشرة ويظهر للجميع."
                        : "سيُرسل الاقتراح لمراجعة الإدارة قبل ظهوره."}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full"
                        disabled={addCategory.isPending}
                        onClick={() => addCategory.mutate()}
                      >
                        {isAdmin ? "إضافة" : "إرسال للمراجعة"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => setShowCategoryInput(false)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCategoryInput(true)}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {isAdmin ? "+ إضافة تصنيف جديد" : "+ اقتراح تصنيف جديد"}
                  </button>
                )}
              </div>


              <div className="space-y-1.5">
                <Label>المحافظة *</Label>
                <select
                  value={form.governorate_id}
                  onChange={(e) => {
                    set("governorate_id", e.target.value);
                    set("city_id", "");
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">اختر</option>
                  {(taxonomy?.governorates ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>المدينة *</Label>
                <CityPicker
                  cities={cities}
                  value={form.city_id}
                  valueKey="id"
                  disabled={!form.governorate_id}
                  onChange={(v) => set("city_id", v)}
                  placeholder={
                    form.governorate_id ? "اختر المدينة" : "اختر المحافظة أولاً"
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">العنوان التفصيلي</Label>
              <Input
                id="address"
                value={form.address}
                maxLength={250}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-bold">المنتجات والخدمات</h2>
            <div className="flex gap-2">
              <Input
                value={productInput}
                maxLength={60}
                placeholder="مثال: قطع غيار، توصيل منزلي"
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addProduct();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addProduct}>
                إضافة
              </Button>
            </div>
            {form.products.length ? (
              <div className="flex flex-wrap gap-2">
                {form.products.map((p) => (
                  <span
                    key={p}
                    className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs"
                  >
                    {p}
                    <button
                      type="button"
                      aria-label={`حذف ${p}`}
                      onClick={() =>
                        set(
                          "products",
                          form.products.filter((x) => x !== p),
                        )
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <h2 className="text-sm font-bold">مميزات النشاط</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                تساعد هذه الخيارات الزوار على الوصول لنشاطك عند البحث بالاحتياج أو
                المزاج أو المناسبة.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>مستوى السعر</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_LEVELS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      set("price_level", form.price_level === p.value ? null : p.value)
                    }
                    className={`rounded-full border px-3 py-1 text-xs ${
                      form.price_level === p.value
                        ? "border-primary bg-primary-soft text-accent-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span dir="ltr">{p.label}</span> {p.hint}
                  </button>
                ))}
              </div>
            </div>

            {ATTR_GROUPS.map((group) => {
              const key = group.key as
                | "amenities"
                | "payment_methods"
                | "good_for"
                | "vibes"
                | "occasions";
              const selected = form[key];
              return (
                <div key={group.key} className="space-y-1.5">
                  <Label>{group.title}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          set(
                            key,
                            selected.includes(o.value)
                              ? selected.filter((v) => v !== o.value)
                              : [...selected, o.value],
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-xs ${
                          selected.includes(o.value)
                            ? "border-primary bg-primary-soft text-accent-foreground"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>



          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-bold">بيانات التواصل</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["phone", "رقم الهاتف"],
                  ["whatsapp", "واتساب"],
                  ["email", "البريد الإلكتروني"],
                  ["website", "الموقع الإلكتروني"],
                  ["facebook", "رابط فيسبوك"],
                  ["instagram", "رابط إنستجرام"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    dir="ltr"
                    value={form[key]}
                    maxLength={255}
                    placeholder={key === "whatsapp" ? "+201012345678" : undefined}
                    onChange={(e) => set(key, e.target.value)}
                    onBlur={
                      key === "whatsapp"
                        ? (e) => set("whatsapp", normalizeEgyptWhatsApp(e.target.value))
                        : undefined
                    }
                  />
                  {key === "whatsapp" ? (
                    form.whatsapp.trim() && !isValidWhatsApp(form.whatsapp) ? (
                      <p className="text-[11px] font-semibold text-destructive">
                        رقم واتساب غير صحيح — اكتب رقماً مصرياً مثل 01012345678 أو رقماً
                        دولياً كاملاً بمفتاح الدولة.
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {whatsAppPreview(form.whatsapp) ||
                          "يُضاف مفتاح مصر (+20) تلقائياً إذا لم تكتبه."}
                      </p>
                    )
                  ) : null}

                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-bold">صورة الغلاف</h2>
            {form.cover_image_url ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={form.cover_image_url}
                  alt="غلاف النشاط"
                  className="aspect-[16/9] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => set("cover_image_url", null)}
                  className="absolute top-2 left-2 rounded-full bg-background/90 p-1.5"
                  aria-label="إزالة الصورة"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground hover:bg-muted">
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {uploading ? "جارٍ الرفع..." : "اختر صورة (حتى 5 ميجابايت)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCover(file);
                }}
              />
            </label>
          </section>

          <ThemeEditor
            value={{
              logo_url: form.logo_url,
              theme_primary: form.theme_primary,
              theme_bg: form.theme_bg,
              theme_style: form.theme_style,
              theme_font: form.theme_font,
              theme_button: form.theme_button,
              theme_contrast: form.theme_contrast,
            }}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            userId={user?.id ?? ""}
            businessName={form.name || "اسم النشاط"}
            coverUrl={form.cover_image_url}
          />

          <GalleryEditor
            businessId={isNew ? null : id}
            userId={user?.id ?? ""}
            draftImages={draftImages}
            onDraftImagesChange={setDraftImages}
            draftCover={form.cover_image_url}
            onDraftCoverChange={(url) => set("cover_image_url", url)}
          />
          <HoursEditor
            businessId={isNew ? null : id}
            value={draftHours}
            onChange={setDraftHours}
          />
          {!isNew ? (
            <>
              <BusinessStats businessId={id} />
              <ManagersEditor businessId={id} />
            </>
          ) : null}



          <div className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline" className="rounded-full">
              <Link to="/dashboard">إلغاء</Link>
            </Button>
            <Button type="submit" disabled={save.isPending} className="rounded-full">
              {save.isPending ? "جارٍ الحفظ..." : "حفظ وإرسال للمراجعة"}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
