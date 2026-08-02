import { useState } from "react";
import { Clock, Sparkles, SlidersHorizontal, X } from "lucide-react";
import {
  ATTR_GROUPS,
  PRICE_LEVELS,
  attrLabel,
} from "@/lib/business-attributes";
import { cn } from "@/lib/utils";

export type AttrParams = {
  amen: string;
  pay: string;
  good: string;
  vibe: string;
  occ: string;
  price: number;
  open: boolean;
};

const KEY_BY_GROUP: Record<string, keyof AttrParams> = {
  amenities: "amen",
  payment_methods: "pay",
  good_for: "good",
  vibes: "vibe",
  occasions: "occ",
};

function list(value: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggle(value: string, slug: string): string {
  const items = list(value);
  const next = items.includes(slug)
    ? items.filter((i) => i !== slug)
    : [...items, slug];
  return next.join(",");
}

/** Count of every active attribute-style filter. */
export function attrCount(params: AttrParams): number {
  return (
    list(params.amen).length +
    list(params.pay).length +
    list(params.good).length +
    list(params.vibe).length +
    list(params.occ).length +
    (params.price ? 1 : 0) +
    (params.open ? 1 : 0)
  );
}

export const EMPTY_ATTRS: AttrParams = {
  amen: "",
  pay: "",
  good: "",
  vibe: "",
  occ: "",
  price: 0,
  open: false,
};

/** Chips panel for services, payments, audience, vibe, occasions and price. */
export function AttributeFilters({
  params,
  onChange,
}: {
  params: AttrParams;
  onChange: (patch: Partial<AttrParams>) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = attrCount(params);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs",
          active
            ? "border-primary bg-primary-soft text-accent-foreground"
            : "border-border bg-card",
        )}
      >
        <SlidersHorizontal className="size-3.5" />
        فلاتر ذكية
        {active ? (
          <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
            {active}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => onChange({ open: !params.open })}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs",
          params.open
            ? "border-primary bg-primary-soft text-accent-foreground"
            : "border-border bg-card",
        )}
      >
        <Clock className="size-3.5" /> مفتوح الآن
      </button>

      {open ? (
        <div className="order-last w-full rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold">اختر ما يناسبك</p>
            <div className="flex items-center gap-2">
              {active ? (
                <button
                  type="button"
                  onClick={() => onChange(EMPTY_ATTRS)}
                  className="text-[11px] underline text-muted-foreground"
                >
                  مسح الفلاتر
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">
                مستوى السعر
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_LEVELS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      onChange({ price: params.price === p.value ? 0 : p.value })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      params.price === p.value
                        ? "border-primary bg-primary-soft text-accent-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span dir="ltr">{p.label}</span> {p.hint}
                  </button>
                ))}
              </div>
            </div>

            {ATTR_GROUPS.map((group) => {
              const key = KEY_BY_GROUP[group.key];
              const selected = list(params[key] as string);
              return (
                <div key={group.key}>
                  <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          onChange({
                            [key]: toggle(params[key] as string, o.value),
                          } as Partial<AttrParams>)
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs",
                          selected.includes(o.value)
                            ? "border-primary bg-primary-soft text-accent-foreground"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Explains how the AI understood a descriptive query. */
export function SmartBanner({
  summary,
  chips,
}: {
  summary: string;
  chips: string[];
}) {
  if (!summary && !chips.length) return null;
  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-accent-foreground">
        <Sparkles className="size-3.5" /> فهمنا طلبك
      </p>
      {summary ? <p className="mt-1 text-xs leading-6">{summary}</p> : null}
      {chips.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-background/70 px-2.5 py-0.5 text-[11px]"
            >
              {attrLabel(c)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
