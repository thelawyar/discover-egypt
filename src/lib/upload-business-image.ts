import { buildImageVariants } from "@/lib/image-optimize";
import { supabase } from "@/integrations/supabase/client";

export type UploadedImage = { url: string; thumbUrl: string | null };

/**
 * Uploads an optimized image (WebP when supported) plus a lightweight thumbnail
 * to business-images and returns long-lived signed URLs for both variants.
 */
export async function uploadBusinessImage(
  file: File,
  userId: string,
  options: {
    maxWidth: number;
    thumbWidth?: number;
    crop?: boolean;
    ratio?: number;
    quality?: number;
  },
): Promise<UploadedImage> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error("الصيغ المدعومة: PNG أو JPG أو WEBP");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("حجم الصورة يجب أن يكون أقل من 10 ميجابايت");
  }

  const { large, thumb } = await buildImageVariants(file, {
    maxWidth: options.maxWidth,
    thumbWidth: options.thumbWidth ?? 480,
    crop: options.crop,
    ratio: options.ratio,
    quality: options.quality ?? 0.84,
  });

  const base = `${userId}/${crypto.randomUUID()}`;
  const upload = async (variant: typeof large, suffix: string) => {
    const path = `${base}-${suffix}.${variant.ext}`;
    const { error } = await supabase.storage
      .from("business-images")
      .upload(path, variant.blob, {
        upsert: false,
        contentType: variant.contentType,
        cacheControl: "31536000",
      });
    if (error) throw error;
    return path;
  };

  const [largePath, thumbPath] = await Promise.all([
    upload(large, String(large.width)),
    upload(thumb, String(thumb.width)),
  ]);

  const { data: signed, error: signError } = await supabase.storage
    .from("business-images")
    .createSignedUrls([largePath, thumbPath], 60 * 60 * 24 * 365);
  if (signError) throw signError;

  const url = signed.find((s) => s.path === largePath)?.signedUrl;
  if (!url) throw new Error("sign_failed");
  return {
    url,
    thumbUrl: signed.find((s) => s.path === thumbPath)?.signedUrl ?? null,
  };
}
