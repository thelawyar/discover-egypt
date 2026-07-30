import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { AdminCategories } from "@/components/AdminCategories";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/_authenticated/admin-categories")({
  head: () => ({
    meta: [
      { title: "إدارة التصنيفات | اكتشف مدينتك" },
      {
        name: "description",
        content: "إضافة وتعديل ومراجعة تصنيفات الأنشطة التجارية في الدليل.",
      },
      { property: "og:title", content: "إدارة التصنيفات | اكتشف مدينتك" },
      {
        property: "og:description",
        content: "إضافة وتعديل ومراجعة تصنيفات الأنشطة التجارية في الدليل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-muted-foreground">
          جارٍ التحميل...
        </p>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-muted-foreground">
          هذه الصفحة متاحة للمسؤولين فقط.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <BackButton fallback="/admin" label="رجوع" />
            <h1 className="mt-2 text-xl font-extrabold">إدارة التصنيفات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              أضف تصنيفاً جديداً أو عدّل اسمه أو راجع اقتراحات المستخدمين.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/admin">
              <ArrowRight className="size-3.5" /> لوحة الإدارة
            </Link>
          </Button>
        </div>
        <AdminCategories />
      </div>
    </PageShell>
  );
}
