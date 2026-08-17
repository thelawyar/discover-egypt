import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ImagePlus,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Star,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadBusinessImage } from "@/lib/upload-business-image";
import { ImageCropDialog, validateImageFile } from "@/components/ImageCropDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type GalleryEditorProps = {
  /** Existing business: images are persisted immediately. Null while creating. */
  businessId?: string | null;
  userId: string;
  /** Draft mode (new business): image urls held in the parent form state. */
  draftImages?: string[];
  onDraftImagesChange?: (urls: string[]) => void;
  /** Draft mode cover selection. */
  draftCover?: string | null;
  onDraftCoverChange?: (url: string) => void;
};

/** Manage the photo gallery shown on the public mini-site. */
export function GalleryEditor({
  businessId,
  userId,
  draftImages,
  onDraftImagesChange,
  draftCover,
  onDraftCoverChange,
}: GalleryEditorProps) {
  const queryClient = useQueryClient();
  const isDraft = !businessId;
  const [uploading, setUploading] = useState(false);
  // Files waiting to be cropped one-by-one before upload.
  const [queue, setQueue] = useState<File[]>([]);
  // Gallery image being previewed before it becomes the cover photo.
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);

  const { data: savedCover, refetch: refetchCover } = useQuery({
    queryKey: ["business-cover", businessId],
    enabled: !isDraft,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("cover_image_url")
        .eq("id", businessId!)
        .maybeSingle();
      if (error) throw error;
      return data?.cover_image_url ?? null;
    },
  });
  const cover = isDraft ? (draftCover ?? null) : (savedCover ?? null);
  const refreshCover = () => (isDraft ? Promise.resolve() : refetchCover());

  const { data: savedImages } = useQuery({
    queryKey: ["business-images", businessId],
    enabled: !isDraft,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_images")
        .select("id,url,sort_order")
        .eq("business_id", businessId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const images = isDraft
    ? (draftImages ?? []).map((url, i) => ({ id: url, url, sort_order: i }))
    : savedImages;

  const refresh = () =>
    isDraft
      ? Promise.resolve()
      : queryClient.invalidateQueries({ queryKey: ["business-images", businessId] });

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
      if (isDraft) {
        onDraftImagesChange?.([...(draftImages ?? []), url]);
      } else {
        const { error } = await supabase
          .from("business_images")
          .insert({ business_id: businessId!, url, sort_order: images?.length ?? 0 });
        if (error) throw error;
        await refresh();
      }
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
    if (isDraft) {
      onDraftImagesChange?.(list.map((img) => img.url));
      return;
    }
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
    if (isDraft) {
      onDraftImagesChange?.((draftImages ?? []).filter((url) => url !== id));
      return;
    }
    const { error } = await supabase.from("business_images").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر حذف الصورة");
      return;
    }
    await refresh();
  }

  /** Pin the previewed gallery image as the business cover photo. */
  async function confirmCover() {
    if (!coverPreview) return;
    if (isDraft) {
      onDraftCoverChange?.(coverPreview);
      setCoverPreview(null);
      toast.success("تم اختيار صورة الغلاف — ستُحفظ مع النشاط");
      return;
    }
    setSavingCover(true);
    const { error } = await supabase
      .from("businesses")
      .update({ cover_image_url: coverPreview, cover_thumb_url: null })
      .eq("id", businessId!);
    setSavingCover(false);
    if (error) {
      toast.error("تعذّر تعيين صورة الغلاف");
      return;
    }
    setCoverPreview(null);
    await queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    await refreshCover();
    toast.success("تم تعيين صورة الغلاف — سيراجعها الفريق قبل النشر");
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="text-sm font-bold">معرض الصور</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          حتى 12 صورة تظهر داخل صفحة النشاط، يتم قصّها مربعة وضغطها تلقائياً، ويمكنك
          إعادة ترتيبها بالأسهم، واختيار أي صورة لتكون غلاف النشاط.
          {isDraft ? " سيتم حفظ الصور مع النشاط عند الضغط على حفظ." : ""}
        </p>
      </div>

      {images?.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, index) => {
            const isCover = cover === img.url;
            return (
            <div
              key={img.id}
              className={`relative overflow-hidden rounded-xl border ${isCover ? "border-primary ring-2 ring-primary" : "border-border"}`}
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
              <button
                type="button"
                aria-label={isCover ? "صورة الغلاف الحالية" : "تعيين كصورة غلاف"}
                title={isCover ? "صورة الغلاف الحالية" : "تعيين كصورة غلاف"}
                onClick={() => setCoverPreview(img.url)}
                className={`absolute top-1 right-1 rounded-full p-1 ${isCover ? "bg-primary text-primary-foreground" : "bg-background/90"}`}
              >
                {isCover ? <Check className="size-3.5" /> : <Star className="size-3.5" />}
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
            );
          })}
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

      <Dialog
        open={!!coverPreview}
        onOpenChange={(open) => !open && setCoverPreview(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة صورة الغلاف</DialogTitle>
            <DialogDescription>
              هكذا ستظهر الصورة كغلاف لصفحة نشاطك. تأكد منها قبل الحفظ.
            </DialogDescription>
          </DialogHeader>
          {coverPreview ? (
            <img
              src={coverPreview}
              alt="معاينة صورة الغلاف"
              className="aspect-[16/9] w-full rounded-xl border border-border object-cover sm:aspect-[820/312]"
            />
          ) : null}
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              className="rounded-full"
              disabled={savingCover || cover === coverPreview}
              onClick={confirmCover}
            >
              {savingCover ? <Loader2 className="size-4 animate-spin" /> : null}
              {cover === coverPreview ? "هي الغلاف الحالي" : "تثبيت كصورة غلاف"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setCoverPreview(null)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>

  );
}
