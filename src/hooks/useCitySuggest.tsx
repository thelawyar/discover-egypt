import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { City } from "@/lib/directory-types";

type SuggestCityResult = {
  status: "created" | "existing" | "similar";
  id: string;
  name: string;
  is_active: boolean;
  similarity: number;
};

function isSuggestCityResult(value: unknown): value is SuggestCityResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    (result.status === "created" ||
      result.status === "existing" ||
      result.status === "similar") &&
    typeof result.id === "string" &&
    typeof result.name === "string" &&
    typeof result.is_active === "boolean"
  );
}

/**
 * Lets a signed-in user add a missing city under a chosen governorate.
 * The new city stays inactive until an admin approves it, so we keep it in
 * local state to make it selectable right away.
 */
export function useCitySuggest() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [extraCities, setExtraCities] = useState<City[]>([]);

  async function suggestCity(
    governorateId: string,
    name: string,
  ): Promise<string | null> {
    if (!governorateId) {
      toast.error("اختر المحافظة أولاً");
      return null;
    }
    setPending(true);
    try {
      const { data, error } = await supabase.rpc("suggest_city", {
        _governorate_id: governorateId,
        _name: name,
      });
      if (error || !isSuggestCityResult(data)) throw error ?? new Error("failed");
      const { id, name: resolvedName, status, is_active } = data;
      setExtraCities((prev) =>
        prev.some((c) => c.id === id)
          ? prev
          : [
              ...prev,
              {
                id,
                name: resolvedName,
                slug: id,
                governorate_id: governorateId,
                is_new_city: status === "created",
                is_active,
              },
            ],
      );
      if (status === "created") {
        queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
        toast.success("تم إرسال المدينة الجديدة لاعتماد الإدارة");
      } else if (status === "similar") {
        toast.warning(`وجدنا مدينة قريبة باسم «${resolvedName}» وتم اختيارها بدلاً من إنشاء نسخة مكررة`);
      } else {
        toast.info(`المدينة «${resolvedName}» موجودة بالفعل وتم اختيارها`);
      }
      return id;
    } catch {
      toast.error("تعذّرت إضافة المدينة");
      return null;
    } finally {
      setPending(false);
    }
  }

  return { suggestCity, pending, extraCities };
}
