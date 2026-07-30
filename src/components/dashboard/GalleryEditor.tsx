import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadBusinessImage } from "@/lib/upload-business-image";

/** Manage the photo gallery shown on the public mini-site. */
export function GalleryEditor({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: images } = useQuery({
    queryKey: ["business-images", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_images")
        .select("id,url,sort_order")
        .eq("business_id", businessId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["business-images", businessId] });

  async function add(files: FileList) {
    setUploading(true);
    try {
      const current = images?.length ?? 0;
      const list = Array.from(files).slice(0, Math.max(0, 12 - current));
      if (!list.length) throw new Error("الحد الأقصى 12 صورة في المعرض");
      let order = current;
      for (const file of list) {
        const url = await uploadBusinessImage(file, userId, { maxWidth: 1200 });
        const { error } = await supabase
          .from("business_images")
          .insert({ business_id: businessId, url, sort_order: order++ });
        if (error) throw error;
      }
      await refresh();
      toast.success("تمت إضافة الصور");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصور");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("business_images").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر حذف الصورة");
      return;
    }
    await refresh();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="text-sm font-bold">معرض الصور</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          حتى 12 صورة تظهر داخل صفحة النشاط.
        </p>
      </div>

      {images?.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative overflow-hidden rounded-xl border border-border"
            >
              <img
                src={img.url}
                alt="صورة من المعرض"
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                aria-label="حذف الصورة"
                onClick={() => remove(img.id)}
                className="absolute top-1 left-1 rounded-full bg-background/90 p-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-5 text-sm text-muted-foreground hover:bg-muted">
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {uploading ? "جارٍ الرفع..." : "أضف صوراً للمعرض"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
          }}
        />
      </label>
    </section>
  );
}
