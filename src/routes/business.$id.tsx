import { createFileRoute, redirect, notFound, Link } from "@tanstack/react-router";
import { getBusiness } from "@/lib/directory.functions";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

/** Legacy URL: /business/<id> permanently points at the handle mini-site. */
export const Route = createFileRoute("/business/$id")({
  loader: async ({ params }) => {
    const data = await getBusiness({ data: { id: params.id } });
    if (!data) throw notFound();
    throw redirect({
      to: "/$username",
      params: { username: data.username },
      statusCode: 301,
    });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => null,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <p className="text-lg font-bold">
          هذا النشاط غير موجود أو لم تتم الموافقة عليه بعد
        </p>
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
