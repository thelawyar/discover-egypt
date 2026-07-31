import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WEEK_DAYS } from "@/lib/directory-types";
import { Button } from "@/components/ui/button";

export type DayRow = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

export const DEFAULT_HOURS: DayRow[] = WEEK_DAYS.map((_, i) => ({
  day_of_week: i,
  opens_at: "09:00",
  closes_at: "22:00",
  is_closed: false,
}));

const DEFAULT_ROWS = DEFAULT_HOURS;

/** Weekly opening hours shown on the public mini-site. */
export function HoursEditor({
  businessId,
  value,
  onChange,
}: {
  /** Existing business: hours are saved immediately. Null while creating. */
  businessId?: string | null;
  /** Draft mode (new business): rows held in the parent form state. */
  value?: DayRow[];
  onChange?: (rows: DayRow[]) => void;
}) {
  const isDraft = !businessId;
  const [localRows, setLocalRows] = useState<DayRow[]>(DEFAULT_ROWS);
  const [saving, setSaving] = useState(false);

  const rows = isDraft ? (value ?? DEFAULT_ROWS) : localRows;

  const { data } = useQuery({
    queryKey: ["business-hours", businessId],
    enabled: !isDraft,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("day_of_week,opens_at,closes_at,is_closed")
        .eq("business_id", businessId!)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data?.length) return;
    setLocalRows(
      DEFAULT_ROWS.map((d) => {
        const found = data.find((h) => h.day_of_week === d.day_of_week);
        if (!found) return d;
        return {
          day_of_week: d.day_of_week,
          opens_at: found.opens_at?.slice(0, 5) ?? "09:00",
          closes_at: found.closes_at?.slice(0, 5) ?? "22:00",
          is_closed: found.is_closed,
        };
      }),
    );
  }, [data]);

  function update(day: number, patch: Partial<DayRow>) {
    const next = rows.map((r) =>
      r.day_of_week === day ? { ...r, ...patch } : r,
    );
    if (isDraft) onChange?.(next);
    else setLocalRows(next);
  }

  async function save() {
    if (isDraft) return;
    setSaving(true);
    try {
      const { error: delError } = await supabase
        .from("business_hours")
        .delete()
        .eq("business_id", businessId!);
      if (delError) throw delError;

      const { error } = await supabase.from("business_hours").insert(
        rows.map((r) => ({
          business_id: businessId!,
          day_of_week: r.day_of_week,
          opens_at: r.is_closed ? null : r.opens_at,
          closes_at: r.is_closed ? null : r.closes_at,
          is_closed: r.is_closed,
        })),
      );
      if (error) throw error;
      toast.success("تم حفظ مواعيد العمل");
    } catch {
      toast.error("تعذّر حفظ المواعيد");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-sm font-bold">مواعيد العمل</h2>
      {isDraft ? (
        <p className="text-[11px] text-muted-foreground">
          حدّد المواعيد الآن وسيتم حفظها مع النشاط عند الضغط على حفظ.
        </p>
      ) : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.day_of_week} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-20 text-muted-foreground">
              {WEEK_DAYS[r.day_of_week]}
            </span>
            <input
              type="time"
              value={r.opens_at}
              disabled={r.is_closed}
              onChange={(e) => update(r.day_of_week, { opens_at: e.target.value })}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-40"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="time"
              value={r.closes_at}
              disabled={r.is_closed}
              onChange={(e) => update(r.day_of_week, { closes_at: e.target.value })}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-40"
            />
            <label className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={r.is_closed}
                onChange={(e) => update(r.day_of_week, { is_closed: e.target.checked })}
              />
              مغلق
            </label>
          </li>
        ))}
      </ul>
      {!isDraft ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={saving}
          onClick={save}
        >
          {saving ? "جارٍ الحفظ..." : "حفظ المواعيد"}
        </Button>
      ) : null}
    </section>
  );
}
