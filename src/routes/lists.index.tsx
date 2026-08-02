import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ListPlus, Bookmark } from "lucide-react";
import { listPublicLists } from "@/lib/lists.functions";
import { getRequestOrigin } from "@/lib/origin.functions";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

const listsQuery = queryOptions({
  queryKey: ["public-lists"],
  queryFn: () => listPublicLists({ data: {} }),
});

export const Route = createFileRoute("/lists/")({
  loader: async ({ context }) => {
    const [origin] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["origin"],
        queryFn: () => getRequestOrigin(),
        staleTime: Infinity,
      }),
      context.queryClient.ensureQueryData(listsQuery),
    ]);
    return { origin };
  },
  head: ({ loaderData }) => {
    const title = "قوائم المستخدمين | اكتشف مدينتك";
    const desc =
      "قوائم مختارة من المستخدمين مثل «أفضل كافيهات في القاهرة» — تصفّحها أو أنشئ قائمتك وشاركها.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `${loaderData?.origin ?? ""}/lists` }],
    };
  },
  component: ListsIndex,
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        تعذّر تحميل القوائم.
      </div>
    </PageShell>
  ),
});

function ListsIndex() {
  const { data: lists } = useSuspenseQuery(listsQuery);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <Bookmark className="size-6 text-primary" /> قوائم مختارة
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              مثل «أفضل كافيهات في القاهرة» — من إعداد مستخدمي الدليل.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/dashboard/lists">
              <ListPlus className="size-4" /> أنشئ قائمتك
            </Link>
          </Button>
        </div>

        {lists.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border py-20 text-center">
            <p className="font-semibold">لا توجد قوائم منشورة بعد</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/dashboard/lists">كن أول من ينشئ قائمة</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => (
              <Link
                key={l.id}
                to="/lists/$slug"
                params={{ slug: l.slug }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-raised"
              >
                <h2 className="line-clamp-2 text-lg font-bold">{l.title}</h2>
                {l.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {l.description}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-muted-foreground">
                  {l.item_count.toLocaleString("ar-EG")} مكان
                  {l.city_name ? ` · ${l.city_name}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
