import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EventCardData } from "./event-kinds";

const listSchema = z.object({
  city: z.string().max(64).optional(),
  gov: z.string().max(64).optional(),
  kind: z.enum(["offer", "party", "opening", "match", "event"]).optional(),
  when: z.enum(["upcoming", "today", "week", "month", "past"]).optional(),
  page: z.number().optional(),
});

export const EVENTS_PER_PAGE = 12;

export const listEvents = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => listSchema.parse(data ?? {}))
  .handler(
    async ({
      data,
    }): Promise<{ items: EventCardData[]; total: number; page: number; perPage: number }> => {
      const { getPublicClient } = await import("./supabase-public.server");
      const { EVENT_SELECT, toEvent, whenRange } = await import("./feed.server");
      const supabase = getPublicClient();

      const perPage = 12;
      const page = Math.max(1, Math.min(100, data.page ?? 1));
      const from = (page - 1) * perPage;
      const when = data.when ?? "upcoming";
      const range = whenRange(when);

      const resolve = async (table: "cities" | "governorates", slug?: string) => {
        if (!slug) return null;
        const { data: row } = await supabase
          .from(table)
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        return row?.id ?? "00000000-0000-0000-0000-000000000000";
      };

      const [cityId, govId] = await Promise.all([
        resolve("cities", data.city),
        resolve("governorates", data.gov),
      ]);

      let query = supabase
        .from("business_events")
        .select(EVENT_SELECT, { count: "exact" })
        .eq("is_published", true);

      if (cityId) query = query.eq("city_id", cityId);
      if (govId) query = query.eq("governorate_id", govId);
      if (data.kind) query = query.eq("kind", data.kind);
      if (range.from) query = query.gte("starts_at", range.from);
      if (range.to) query = query.lte("starts_at", range.to);

      const { data: rows, count } = await query
        .order("is_featured", { ascending: false })
        .order("starts_at", { ascending: when !== "past" })
        .range(from, from + perPage - 1);

      return {
        items: (rows ?? []).map((r) => toEvent(r as unknown as Record<string, unknown>)),
        total: count ?? 0,
        page,
        perPage,
      };
    },
  );

export const getEvent = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().max(64) }).parse(data))
  .handler(async ({ data }): Promise<EventCardData | null> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const { EVENT_SELECT, toEvent } = await import("./feed.server");
    const supabase = getPublicClient();

    const { data: row } = await supabase
      .from("business_events")
      .select(EVENT_SELECT)
      .eq("id", data.id)
      .eq("is_published", true)
      .maybeSingle();

    return row ? toEvent(row as unknown as Record<string, unknown>) : null;
  });
