import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Store,
  Facebook,
  Instagram,
  Clock,
} from "lucide-react";
import { getBusiness } from "@/lib/directory.functions";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { WEEK_DAYS } from "@/lib/directory-types";

function businessQuery(id: string) {
  return queryOptions({
    queryKey: ["business", id],
    queryFn: () => getBusiness({ data: { id } }),
  });
}

export const Route = createFileRoute("/business/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(businessQuery(params.id));
    if (!data) throw notFound();
    return { name: data.name, description: data.description, image: data.cover_image_url };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "النشاط غير متاح | دَوّر في بلدك" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const desc =
      loaderData.description?.slice(0, 150) ??
      `تفاصيل ${loaderData.name} في الدليل التجاري دَوّر في بلدك.`;
    const meta = [
      { title: `${loaderData.name} | دَوّر في بلدك` },
      { name: "description", content: desc },
      { property: "og:title", content: `${loaderData.name} | دَوّر في بلدك` },
      { property: "og:description", content: desc },
    ];
    if (loaderData.image?.startsWith("https://")) {
      meta.push(
        { property: "og:image", content: loaderData.image },
        { name: "twitter:image", content: loaderData.image },
      );
    }
    return { meta };
  },
  component: BusinessPage,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <p className="text-lg font-bold">هذا النشاط غير موجود أو لم تتم الموافقة عليه بعد</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </PageShell>
  ),
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل بيانات النشاط.
      </div>
    </PageShell>
  ),
});

function BusinessPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(businessQuery(id));
  if (!data) return null;

  const rating = data.reviews.length
    ? data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length
    : null;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-muted">
          <div className="aspect-[21/9] w-full">
            {data.cover_image_url ? (
              <img
                src={data.cover_image_url}
                alt={data.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Store className="size-14" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold">{data.name}</h1>
              {data.category_name ? (
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
                  {data.category_name}
                </span>
              ) : null}
              {data.is_featured ? (
                <span className="flex items-center gap-1 rounded-full bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground">
                  <Star className="size-3 fill-current" /> مميز
                </span>
              ) : null}
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {data.city_slug ? (
                <Link
                  to="/city/$slug"
                  params={{ slug: data.city_slug }}
                  className="hover:text-primary"
                >
                  {data.city_name}
                </Link>
              ) : (
                data.city_name
              )}
              {data.governorate_name ? ` · ${data.governorate_name}` : ""}
              {data.address ? ` · ${data.address}` : ""}
            </p>

            {rating !== null ? (
              <p className="mt-2 flex items-center gap-1 text-sm">
                <Star className="size-4 fill-warning text-warning" />
                <span className="font-bold">{rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({data.reviews.length} تقييم)
                </span>
              </p>
            ) : null}

            {data.description ? (
              <p className="mt-5 whitespace-pre-line leading-7 text-foreground">
                {data.description}
              </p>
            ) : null}

            {data.products.length ? (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-bold">المنتجات والخدمات</h2>
                <div className="flex flex-wrap gap-2">
                  {data.products.map((p) => (
                    <span
                      key={p}
                      className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {data.images.length ? (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-bold">معرض الصور</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={data.name}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {data.reviews.length ? (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-bold">آراء العملاء</h2>
                <div className="space-y-3">
                  {data.reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {r.author_name ?? "زائر"}
                        </span>
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={
                                i < r.rating
                                  ? "size-3.5 fill-warning text-warning"
                                  : "size-3.5 text-border"
                              }
                            />
                          ))}
                        </span>
                      </div>
                      {r.comment ? (
                        <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="mb-3 text-sm font-bold">بيانات التواصل</h2>
              <div className="space-y-2">
                {data.phone ? (
                  <a
                    href={`tel:${data.phone}`}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-primary-soft"
                  >
                    <Phone className="size-4 text-primary" />
                    <span dir="ltr">{data.phone}</span>
                  </a>
                ) : null}
                {data.whatsapp ? (
                  <a
                    href={`https://wa.me/${encodeURIComponent(data.whatsapp.replace(/\D/g, ""))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-primary-soft"
                  >
                    <MessageCircle className="size-4 text-success" />
                    واتساب
                  </a>
                ) : null}
                {data.email ? (
                  <a
                    href={`mailto:${data.email}`}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-primary-soft"
                  >
                    <Mail className="size-4 text-primary" />
                    <span dir="ltr">{data.email}</span>
                  </a>
                ) : null}
                {data.website ? (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-primary-soft"
                  >
                    <Globe className="size-4 text-primary" />
                    الموقع الإلكتروني
                  </a>
                ) : null}
                {data.facebook ? (
                  <a
                    href={data.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-primary-soft"
                  >
                    <Facebook className="size-4 text-primary" />
                    فيسبوك
                  </a>
                ) : null}
                {data.instagram ? (
                  <a
                    href={data.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-primary-soft"
                  >
                    <Instagram className="size-4 text-primary" />
                    إنستجرام
                  </a>
                ) : null}
              </div>
            </div>

            {data.hours.length ? (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Clock className="size-4" /> مواعيد العمل
                </h2>
                <ul className="space-y-1.5 text-xs">
                  {data.hours.map((h) => (
                    <li key={h.day_of_week} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {WEEK_DAYS[h.day_of_week]}
                      </span>
                      <span dir="ltr">
                        {h.is_closed
                          ? "مغلق"
                          : `${h.opens_at?.slice(0, 5) ?? "--"} - ${h.closes_at?.slice(0, 5) ?? "--"}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.latitude && data.longitude ? (
              <a
                href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-card hover:bg-muted"
              >
                <MapPin className="size-4 text-primary" />
                افتح الموقع على الخريطة
              </a>
            ) : null}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
