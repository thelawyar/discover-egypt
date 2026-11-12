import { Link } from "@tanstack/react-router";
import { MapPin, ShoppingBag } from "lucide-react";
import type { ProductSearchResult } from "@/lib/directory-types";
import { discountPercent, formatEGP } from "@/lib/store";
import { Highlight } from "@/lib/highlight";

export function ProductResultCard({ item, terms }: { item: ProductSearchResult; terms: string[] }) {
  const discount = item.price == null ? 0 : discountPercent(item.price, item.original_price);
  return <Link to="/$username" params={{ username: item.username }} hash={`product-${item.id}`}
    className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-raised">
    {item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" className="aspect-square w-full bg-muted object-contain" />
      : <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground"><ShoppingBag className="size-10" /></div>}
    <div className="flex flex-1 flex-col gap-2 p-4">
      <h3 className="line-clamp-2 text-base font-bold"><Highlight text={item.name} terms={terms} /></h3>
      <p className="truncate text-xs text-primary">{item.business_name}</p>
      {item.description ? <p className="line-clamp-2 text-xs text-muted-foreground"><Highlight text={item.description} terms={terms} /></p> : null}
      {item.price != null ? <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">{item.price_from ? "من " : ""}{formatEGP(item.price)}</span>
        {discount > 0 && item.original_price != null ? <><del className="text-xs text-muted-foreground">{formatEGP(item.original_price)}</del><span className="rounded bg-success/15 px-1.5 py-0.5 text-xs font-bold text-success">خصم {discount}%</span></> : null}
      </div> : null}
      {!item.in_stock ? <p className="text-xs text-destructive">نفدت الكمية</p> : null}
      <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" />{[item.city_name, item.governorate_name].filter(Boolean).join(" · ")}</p>
    </div>
  </Link>;
}