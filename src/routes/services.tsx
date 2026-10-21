import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MessageCircle, Phone, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { whatsAppLink } from "@/lib/phone";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "مقدمو الخدمات | durtown — استكشف مدينتك" },
      { name: "description", content: "دليل مقدمي الخدمات في مدينتك: سباكة، كهرباء، نقل، دروس خصوصية وغيرها مع أرقام التواصل." },
      { property: "og:title", content: "مقدمو الخدمات | durtown" },
      { property: "og:description", content: "ابحث عن مقدمي الخدمات في مدينتك وتواصل معهم مباشرة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicesPage,
});

type Provider = {
  id: string;
  name: string | null;
  phone: string;
  service_type: string;
  description: string | null;
};

function ServicesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["service-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id,name,phone,service_type,description")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Provider[];
    },
  });

  const list = useMemo(() => {
    const t = q.trim();
    if (!t) return data;
    return data.filter((p) =>
      [p.name, p.service_type, p.description, p.phone].some((v) => v?.includes(t)),
    );
  }, [data, q]);

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Wrench className="size-6 text-primary" /> مقدمو الخدمات
          </h1>
          <Button onClick={() => setOpen((v) => !v)} className="rounded-full">
            {open ? "إغلاق" : "أضف خدمتك"}
          </Button>
        </div>
        {open ? <AddProviderForm onDone={() => setOpen(false)} /> : null}
        <div className="relative mt-6">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بنوع الخدمة أو الاسم..."
            className="ps-9"
          />
        </div>
        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : list.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">لا يوجد مقدمو خدمات مطابقون.</p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {list.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {p.service_type}
                </span>
                {p.name ? <p className="mt-3 font-bold">{p.name}</p> : null}
                {p.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a href={`tel:${p.phone}`} dir="ltr">
                      <Phone className="size-3.5" /> {p.phone}
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a
                      href={whatsAppLink(p.phone, p.name ?? p.service_type, "https://durtown.com/services")}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-3.5" /> واتساب
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function AddProviderForm({ onDone }: { onDone: () => void }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");
  const [desc, setDesc] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_providers").insert({
        user_id: user!.id,
        name: name.trim() || null,
        phone: phone.trim(),
        service_type: type.trim(),
        description: desc.trim() || null,
        status: isAdmin ? "approved" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isAdmin ? "تمت الإضافة" : "تم الإرسال وسيظهر بعد موافقة الإدارة");
      qc.invalidateQueries({ queryKey: ["service-providers"] });
      onDone();
    },
    onError: () => toast.error("تعذر الحفظ"),
  });

  if (!user) {
    return (
      <div className="mt-4 rounded-2xl border border-border p-4 text-sm">
        <Link to="/auth" className="font-semibold text-primary">سجّل الدخول</Link> لإضافة خدمتك.
      </div>
    );
  }

  const valid = /^[+\d\s-]{8,20}$/.test(phone.trim()) && type.trim().length >= 2;

  return (
    <form
      className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate();
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم (اختياري)" maxLength={80} />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الموبايل *" dir="ltr" maxLength={20} required />
      <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="نوع الخدمة * (مثال: سباك)" maxLength={60} required />
      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف قصير للخدمة" maxLength={300} rows={3} />
      <Button type="submit" disabled={!valid || save.isPending} className="rounded-full">
        {save.isPending ? "جارٍ الحفظ..." : "إرسال"}
      </Button>
    </form>
  );
}
