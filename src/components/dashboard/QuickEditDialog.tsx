import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type QuickEditBusiness = {
  id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  products?: string[] | null;
};

/** Lightweight in-place edit of the key business fields; resubmits for review. */
export function QuickEditDialog({
  business,
  onClose,
}: {
  business: QuickEditBusiness | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", phone: "", address: "", products: "" });

  useEffect(() => {
    if (!business) return;
    setForm({
      name: business.name ?? "",
      description: business.description ?? "",
      phone: business.phone ?? "",
      address: business.address ?? "",
      products: (business.products ?? []).join("، "),
    });
  }, [business]);

  const save = useMutation({
    mutationFn: async () => {
      if (!business) return;
      const name = form.name.trim();
      if (name.length < 2) throw new Error("اسم النشاط مطلوب");
      const products = form.products
        .split(/[،,\n]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 40);
      const { error } = await supabase
        .from("businesses")
        .update({
          name,
          description: form.description.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          products,
        })
        .eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إرسال التعديل للمراجعة");
      queryClient.invalidateQueries({ queryKey: ["my-businesses-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["business-moderation-log"] });
      onClose();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ التعديل"),
  });

  return (
    <Dialog open={Boolean(business)} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات النشاط</DialogTitle>
          <DialogDescription>
            بعد الحفظ يعود النشاط إلى «قيد المراجعة» حتى توافق الإدارة على التعديل.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qe-name">اسم النشاط</Label>
            <Input
              id="qe-name"
              value={form.name}
              maxLength={120}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qe-desc">الوصف</Label>
            <Textarea
              id="qe-desc"
              rows={3}
              maxLength={1500}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qe-phone">الهاتف</Label>
              <Input
                id="qe-phone"
                value={form.phone}
                maxLength={30}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qe-address">العنوان</Label>
              <Input
                id="qe-address"
                value={form.address}
                maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qe-products">المنتجات والخدمات (افصل بينها بفاصلة)</Label>
            <Textarea
              id="qe-products"
              rows={2}
              maxLength={800}
              value={form.products}
              onChange={(e) => setForm((f) => ({ ...f, products: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            className="rounded-full"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ وإرسال للمراجعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
