import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  Link2,
  Check,
  Copy,
  Share2,
} from "lucide-react";
import type { BusinessDetail } from "@/lib/directory-types";
import { WEEK_DAYS } from "@/lib/directory-types";
import { resolveTheme, themeVars } from "@/lib/business-theme";
import { supabase } from "@/integrations/supabase/client";
import { BusinessPageAds } from "@/components/ads/BusinessPageAds";
import { QrCodeButton } from "@/components/QrCodeButton";
import { Button } from "@/components/ui/button";

/** Where the visit came from, derived from the referrer. */
function visitSource(): string {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return "internal";
    if (/google\./.test(host)) return "google";
    if (/facebook\.|fb\./.test(host)) return "facebook";
    if (/instagram\./.test(host)) return "instagram";
    if (/wa\.me|whatsapp/.test(host)) return "whatsapp";
    if (/t\.co|twitter\.|x\.com/.test(host)) return "twitter";
    return host.slice(0, 60);
  } catch {
    return "direct";
  }
}

function trackContact(businessId: string, label: string) {
  void supabase.rpc("track_business_event", {
    _business_id: businessId,
    _event_type: "contact_click",
    _source: visitSource(),
    _label: label,
  });
}

/** Shareable one-page mini-site link, like a Facebook page handle. */
function HandleBar({ username, name }: { username: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shortHost = origin.replace(/^https?:\/\//, "");
  const fullUrl = `${origin}/${username}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: name, url: fullUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    void copy();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3"
      style={{ borderColor: "var(--biz-border)", background: "var(--biz-card)" }}
    >
      <Link2 className="size-4" style={{ color: "var(--biz-primary)" }} />
      <span className="text-sm font-semibold" dir="ltr">
        {shortHost}/{username}
      </span>
      <div className="ms-auto flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="rounded-full" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "تم النسخ" : "نسخ الرابط"}
        </Button>
        <Button variant="outline" size="sm" className="rounded-full" onClick={share}>
          <Share2 className="size-3.5" /> مشاركة
        </Button>
        <QrCodeButton url={fullUrl} fileName={username} />
      </div>
    </div>
  );
}

type ContactLink = {
  key: string;
  href: string;
  label: string;
  ltr?: boolean;
  external?: boolean;
  icon: typeof Phone;
};

/** Full public mini-site for one business. */
export function BusinessProfile({ data }: { data: BusinessDetail }) {
  const theme = resolveTheme(data);
  const tracked = useRef(false);

  const rating = data.reviews.length
    ? data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length
    : null;

  // Count one page view per mount, with the referrer as its source.
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void supabase.rpc("track_business_event", {
      _business_id: data.id,
      _event_type: "view",
      _source: visitSource(),
      _label: null,
    });
  }, [data.id]);

  const contacts: ContactLink[] = [
    ...(data.phone
      ? [
          {
            key: "phone",
            href: `tel:${data.phone}`,
            label: data.phone,
            ltr: true,
            icon: Phone,
          },
        ]
      : []),
    ...(data.whatsapp
      ? [
          {
            key: "whatsapp",
            href: `https://wa.me/${encodeURIComponent(data.whatsapp.replace(/\D/g, ""))}`,
            label: "واتساب",
            external: true,
            icon: MessageCircle,
          },
        ]
      : []),
    ...(data.email
      ? [
          {
            key: "email",
            href: `mailto:${data.email}`,
            label: data.email,
            ltr: true,
            icon: Mail,
          },
        ]
      : []),
    ...(data.website
      ? [
          {
            key: "website",
            href: data.website,
            label: "الموقع الإلكتروني",
            external: true,
            icon: Globe,
          },
        ]
      : []),
    ...(data.facebook
      ? [
          {
            key: "facebook",
            href: data.facebook,
            label: "فيسبوك",
            external: true,
            icon: Facebook,
          },
        ]
      : []),
    ...(data.instagram
      ? [
          {
            key: "instagram",
            href: data.instagram,
            label: "إنستجرام",
            external: true,
            icon: Instagram,
          },
        ]
      : []),
  ];

  const cardStyle = {
    borderColor: "var(--biz-border)",
    background: "var(--biz-card)",
  };
  const softStyle = { background: "var(--biz-soft)" };

  return (
    <div style={themeVars(theme)}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div
          className="relative overflow-hidden rounded-3xl border"
          style={cardStyle}
        >
          <div className="aspect-[21/9] w-full">
            {data.cover_image_url ? (
              <img
                src={data.cover_image_url}
                alt={data.name}
                className="size-full object-cover"
              />
            ) : (
              <div
                className="flex size-full items-center justify-center"
                style={{ color: "var(--biz-muted)" }}
              >
                <Store className="size-14" />
              </div>
            )}
          </div>
          {data.logo_url ? (
            <img
              src={data.logo_url}
              alt={`شعار ${data.name}`}
              className="absolute bottom-4 start-6 size-20 rounded-2xl border-2 object-cover shadow-lg sm:size-24"
              style={{ borderColor: "var(--biz-card)", background: "var(--biz-card)" }}
            />
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold">{data.name}</h1>
              {data.category_name ? (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={softStyle}
                >
                  {data.category_name}
                </span>
              ) : null}
              {data.is_featured ? (
                <span className="flex items-center gap-1 rounded-full bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground">
                  <Star className="size-3 fill-current" /> مميز
                </span>
              ) : null}
            </div>

            <p
              className="mt-2 flex items-center gap-1.5 text-sm"
              style={{ color: "var(--biz-muted)" }}
            >
              <MapPin className="size-4" />
              {data.city_slug ? (
                <Link to="/city/$slug" params={{ slug: data.city_slug }}>
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
                <span style={{ color: "var(--biz-muted)" }}>
                  ({data.reviews.length} تقييم)
                </span>
              </p>
            ) : null}

            <div className="mt-4">
              <HandleBar username={data.username} name={data.name} />
            </div>

            {data.description ? (
              <p className="mt-5 whitespace-pre-line leading-7">{data.description}</p>
            ) : null}

            {data.products.length ? (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-bold">المنتجات والخدمات</h2>
                <div className="flex flex-wrap gap-2">
                  {data.products.map((p) => (
                    <span
                      key={p}
                      className="rounded-lg px-3 py-1.5 text-xs"
                      style={softStyle}
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
                      className="aspect-square w-full rounded-xl border object-cover"
                      style={{ borderColor: "var(--biz-border)" }}
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
                    <div key={r.id} className="rounded-2xl border p-4" style={cardStyle}>
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
                                  : "size-3.5 opacity-30"
                              }
                            />
                          ))}
                        </span>
                      </div>
                      {r.comment ? (
                        <p className="mt-2 text-sm" style={{ color: "var(--biz-muted)" }}>
                          {r.comment}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <BusinessPageAds />
            {contacts.length ? (
              <div className="rounded-2xl border p-4" style={cardStyle}>
                <h2 className="mb-3 text-sm font-bold">بيانات التواصل</h2>
                <div className="space-y-2">
                  {contacts.map((c) => {
                    const Icon = c.icon;
                    return (
                      <a
                        key={c.key}
                        href={c.href}
                        {...(c.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        onClick={() => trackContact(data.id, c.key)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                        style={softStyle}
                      >
                        <Icon className="size-4" style={{ color: "var(--biz-primary)" }} />
                        <span {...(c.ltr ? { dir: "ltr" } : {})}>{c.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {data.hours.length ? (
              <div className="rounded-2xl border p-4" style={cardStyle}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Clock className="size-4" /> مواعيد العمل
                </h2>
                <ul className="space-y-1.5 text-xs">
                  {data.hours.map((h) => (
                    <li key={h.day_of_week} className="flex justify-between">
                      <span style={{ color: "var(--biz-muted)" }}>
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
                onClick={() => trackContact(data.id, "map")}
                className="flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium"
                style={cardStyle}
              >
                <MapPin className="size-4" style={{ color: "var(--biz-primary)" }} />
                افتح الموقع على الخريطة
              </a>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

