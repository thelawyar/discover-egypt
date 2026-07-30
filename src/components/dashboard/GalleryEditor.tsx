import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadBusinessImage } from "@/lib/upload-business-image";
import { ImageCropDialog, validateImageFile } from "@/components/ImageCropDialog";

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
  // Files waiting to be cropped one-by-one before upload.
  const [queue, setQueue] = useState<File[]>([]);

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

  /** Validate the picked files and queue the valid ones for cropping. */
  function pick(files: FileList) {
    const current = images?.length ?? 0;
    const room = Math.max(0, 12 - current);
    if (!room) {
      toast.error("الحد الأقصى 12 صورة في المعرض");
      return;
    }
    const picked = Array.from(files);
    const valid: File[] = [];
    for (const file of picked.slice(0, room)) {
      const invalid = validateImageFile(file);
      if (invalid) {
        toast.error(`${file.name}: ${invalid}`);
        continue;
      }
      valid.push(file);
    }
    if (picked.length > room) {
      toast.warning(`تم اختيار ${room} صورة فقط — الحد الأقصى 12 صورة في المعرض.`);
    }
    if (valid.length) setQueue(valid);
  }

  /** Upload one cropped image and move to the next file in the queue. */
  async function uploadCropped(cropped: File) {
    setUploading(true);
    try {
      const { url } = await uploadBusinessImage(cropped, userId, {
        maxWidth: 1200,
        thumbWidth: 480,
        quality: 0.82,
      });
      const { error } = await supabase
        .from("business_images")
        .insert({ business_id: businessId, url, sort_order: images?.length ?? 0 });
      if (error) throw error;
      await refresh();
      toast.success("تمت إضافة الصورة");
      setQueue((q) => q.slice(1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  /** Move an image one slot and renumber sort_order sequentially. */
  async function move(index: number, dir: -1 | 1) {
    const list = [...(images ?? [])];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const updates = list.map((img, i) =>
      supabase.from("business_images").update({ sort_order: i }).eq("id", img.id),
    );
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      toast.error("تعذّر إعادة الترتيب");
      return;
    }
    await refresh();
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
          حتى 12 صورة تظهر داخل صفحة النشاط، يتم قصّها مربعة وضغطها تلقائياً، ويمكنك
          إعادة ترتيبها بالأسهم.
        </p>
      </div>

      {images?.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, index) => (
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
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button
                  type="button"
                  aria-label="تحريك لليمين"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-full bg-background/90 p-1 disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="تحريك لليسار"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  className="rounded-full bg-background/90 p-1 disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
              </div>
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
        {uploading ? "جارٍ الرفع..." : "أضف صوراً للمعرض (قصّ ومعاينة قبل الحفظ)"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) pick(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <ImageCropDialog
        file={queue[0] ?? null}
        ratio={1}
        outputWidth={1200}
        title={`قصّ صورة المعرض (${queue.length} متبقية)`}
        busy={uploading}
        onCancel={() => setQueue((q) => q.slice(1))}
        onConfirm={uploadCropped}
      />
    </section>
  );
}
