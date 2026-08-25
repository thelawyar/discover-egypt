import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityPicker } from "@/components/CityPicker";
import type { City, Governorate } from "@/lib/directory-types";
import { citiesForGovernorate } from "@/lib/location-filter";

type BranchRow = {
  id: string;
  name: string;
  governorate_id: string | null;
  city_id: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
};

const EMPTY = {
  name: "",
  governorate_id: "",
  city_id: "",
  address: "",
  phone: "",
  whatsapp: "",
};

/**
 * Extra branches of one business. Each branch has its own city, so the
 * business shows up when visitors filter by any of those cities.
 */
export function BranchesEditor({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(EMPTY);

  const { data: taxonomy } = useQuery({
    queryKey: ["branches-taxonomy"],
    queryFn: async () => {
      const [govs, cities] = await Promise.all([
        supabase.from("governorates").select("id,name,slug").order("sort_order"),
        supabase
          .from("cities")
          .select("id,name,slug,governorate_id,is_new_city")
          .eq("is_active", true)
          .order("name"),
      ]);
      return {
        governorates: (govs.data ?? []) as Governorate[],
        cities: (cities.data ?? []) as City[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["business-branches", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_branches")
        .select("id,name,governorate_id,city_id,address,phone,whatsapp")
        .eq("business_id", businessId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as BranchRow[];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["business-branches", businessId] });
  }

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("business_branches").insert({
        business_id: businessId,
        name: draft.name.trim(),
        governorate_id: draft.governorate_id || null,
        city_id: draft.city_id || null,
        address: draft.address.trim() || null,
        phone: draft.phone.trim() || null,
        whatsapp: draft.whatsapp.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(EMPTY);
      toast.success("تمت إضافة الفرع");
      invalidate();
    },
    onError: () => toast.error("تعذّرت إضافة الفرع"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الفرع");
      invalidate();
    },
    onError: () => toast.error("تعذّر حذف الفرع"),
  });

  const cityName = (id: string | null) =>
    taxonomy?.cities.find((c) => c.id === id)?.name ?? "";
  const govName = (id: string | null) =>
    taxonomy?.governorates.find((g) => g.id === id)?.name ?? "";

  const cityOptions = citiesForGovernorate(
    taxonomy?.cities ?? [],
    draft.governorate_id || null,
  );

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="text-sm font-bold">فروع النشاط</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          أضف فروعك في المدن الأخرى، وسيظهر نشاطك عند البحث أو الفلترة بأي مدينة من مدن الفروع.
        </p>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : branches?.length ? (
        <ul className="space-y-2">
          {branches.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
            >
              <MapPin className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{b.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[cityName(b.city_id), govName(b.governorate_id), b.address]
                    .filter(Boolean)
                    .join(" · ") || "بدون موقع محدد"}
                </p>
                {b.phone || b.whatsapp ? (
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {[b.phone, b.whatsapp].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (confirm("حذف هذا الفرع؟")) remove.mutate(b.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          لم تضف أي فرع بعد.
        </p>
      )}

      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.name.trim()) {
            toast.error("اسم الفرع مطلوب");
            return;
          }
          if (!draft.city_id) {
            toast.error("اختر مدينة الفرع");
            return;
          }
          add.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>اسم الفرع *</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="فرع المنصورة"
              className="mt-1"
            />
          </div>
          <div>
            <Label>المحافظة</Label>
            <select
              value={draft.governorate_id}
              onChange={(e) =>
                setDraft({ ...draft, governorate_id: e.target.value, city_id: "" })
              }
              className="mt-1 h-9 w-full rounded-full border border-border bg-card px-3 text-xs"
            >
              <option value="">اختر المحافظة</option>
              {(taxonomy?.governorates ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>المدينة *</Label>
            <CityPicker
              cities={cityOptions}
              value={draft.city_id}
              valueKey="id"
              onChange={(value) => {
                const city = cityOptions.find((c) => c.id === value);
                setDraft({
                  ...draft,
                  city_id: value,
                  governorate_id: draft.governorate_id || (city?.governorate_id ?? ""),
                });
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label>العنوان</Label>
            <Input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input
              value={draft.phone}
              dir="ltr"
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>واتساب</Label>
            <Input
              value={draft.whatsapp}
              dir="ltr"
              onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <Button type="submit" className="rounded-full" disabled={add.isPending}>
          <Plus className="size-4" /> {add.isPending ? "جارٍ الإضافة..." : "إضافة فرع"}
        </Button>
      </form>
    </section>
  );
}
