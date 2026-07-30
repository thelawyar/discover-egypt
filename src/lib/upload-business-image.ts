import { optimizeImage } from "@/lib/image-optimize";
import { supabase } from "@/integrations/supabase/client";

/** Uploads an optimized image to business-images and returns a long-lived signed URL. */
export async function uploadBusinessImage(
  file: File,
  userId: string,
  options: { maxWidth: number; crop?: boolean; ratio?: number; quality?: number },
): Promise<string> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error("الصيغ المدعومة: PNG أو JPG أو WEBP");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("حجم الصورة يجب أن يكون أقل من 10 ميجابايت");
  }

  const image = await optimizeImage(file, {
    maxWidth: options.maxWidth,
    crop: options.crop,
    ratio: options.ratio,
    quality: options.quality ?? 0.84,
  });
  const path = `${userId}/${crypto.randomUUID()}.${image.ext}`;

  const { error } = await supabase.storage
    .from("business-images")
    .upload(path, image.blob, {
      upsert: false,
      contentType: image.contentType,
      cacheControl: "31536000",
    });
  if (error) throw error;

  const { data: signed, error: signError } = await supabase.storage
    .from("business-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError) throw signError;
  return signed.signedUrl;
}
