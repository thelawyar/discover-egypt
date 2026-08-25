import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { City } from "@/lib/directory-types";

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
      if (error || !data) throw error ?? new Error("failed");
      const id = data as string;
      setExtraCities((prev) =>
        prev.some((c) => c.id === id)
          ? prev
          : [
              ...prev,
              {
                id,
                name,
                slug: id,
                governorate_id: governorateId,
                is_new_city: false,
                is_active: false,
              },
            ],
      );
      queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
      toast.success("تمت إضافة المدينة، وستظهر للجميع بعد اعتماد الإدارة");
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
