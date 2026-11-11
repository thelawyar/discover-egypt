import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, BriefcaseBusiness, CalendarDays, Clock, ExternalLink, Images, MapPin, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABELS } from "@/lib/directory-types";
import { HoursEditor } from "@/components/dashboard/HoursEditor";
import { GalleryEditor } from "@/components/dashboard/GalleryEditor";
import { JobsEditor } from "@/components/dashboard/JobsEditor";
import { EventsEditor } from "@/components/dashboard/EventsEditor";
import { BranchesEditor } from "@/components/dashboard/BranchesEditor";
import { StoreEditor } from "@/components/dashboard/StoreEditor";

export const Route = createFileRoute("/_authenticated/dashboard/manage/$id")({
  head: () => ({
    meta: [
      { title: "إدارة النشاط | اكتشف مدينتك" },
      {
        name: "description",
        content: "أدر مواعيد العمل ومعرض الصور والوظائف والعروض والأحداث الخاصة بنشاطك.",
      },
      { property: "og:title", content: "إدارة النشاط | اكتشف مدينتك" },
      {
        property: "og:description",
        content: "مواعيد العمل، الصور، الوظائف، العروض والأحداث في مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManageBusinessPage,
});

const TABS = [
  { key: "store", label: "المتجر", icon: ShoppingBag },
  { key: "hours", label: "مواعيد العمل", icon: Clock },
  { key: "gallery", label: "الصور", icon: Images },
  { key: "jobs", label: "الوظائف", icon: BriefcaseBusiness },
  { key: "events", label: "العروض والأحداث", icon: CalendarDays },
  { key: "branches", label: "الفروع", icon: MapPin },
] as const;

function ManageBusinessPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: business, isLoading } = useQuery({
    queryKey: ["manage-business", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,username,status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : !business ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <p className="font-semibold">لم يتم العثور على النشاط</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/dashboard/businesses">العودة لأنشطتي</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold">إدارة النشاط: {business.name}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  مواعيد العمل والصور والوظائف والعروض — دون الحاجة لإعادة إرسال بيانات النشاط
                  للمراجعة. الحالة: {STATUS_LABELS[business.status] ?? business.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/dashboard/business/$id" params={{ id }}>
                    <Pencil className="size-4" /> تعديل بيانات النشاط
                  </Link>
                </Button>
                {business.status === "approved" ? (
                  <Button asChild variant="ghost" className="rounded-full">
                    <Link to="/$username" params={{ username: business.username }}>
                      <ExternalLink className="size-4" /> الصفحة العامة
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <Tabs defaultValue="hours" className="mt-6">
              <TabsList className="w-full flex-wrap">
                {TABS.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="flex-1 text-xs sm:text-sm">
                    <t.icon className="size-4" /> {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="hours" className="mt-4">
                <HoursEditor businessId={id} />
              </TabsContent>
              <TabsContent value="gallery" className="mt-4">
                <GalleryEditor businessId={id} userId={user?.id ?? ""} />
              </TabsContent>
              <TabsContent value="jobs" className="mt-4">
                <JobsEditor businessId={id} />
              </TabsContent>
              <TabsContent value="events" className="mt-4">
                <EventsEditor businessId={id} />
              </TabsContent>
              <TabsContent value="store" className="mt-4">
                <StoreEditor businessId={id} userId={user?.id ?? ""} />
              </TabsContent>
              <TabsContent value="branches" className="mt-4">
                <BranchesEditor businessId={id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PageShell>
  );
}
