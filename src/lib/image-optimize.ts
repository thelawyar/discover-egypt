/** Browser-side image compression: resizes and re-encodes uploads before they hit storage. */

export type OptimizedImage = {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
  contentType: string;
};

const OG_RATIO = 1200 / 630;

function supportsWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_decode_failed"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function encode(
  canvas: HTMLCanvasElement,
  quality: number,
  format?: "jpeg",
): Promise<{ blob: Blob; ext: string; contentType: string }> {
  // JPEG is forced for share-critical images (cover/logo): social crawlers and
  // the Open Graph rasterizer cannot read WebP.
  const type = format === "jpeg" || !supportsWebp() ? "image/jpeg" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  if (!blob) throw new Error("image_encode_failed");
  return {
    blob,
    ext: type === "image/webp" ? "webp" : "jpg",
    contentType: type,
  };
}

/**
 * Resize to fit within maxWidth (keeps aspect ratio).
 * When `crop` is set, the image is center-cropped to `ratio` (default 1.91:1 Open Graph).
 */
export async function optimizeImage(
  file: File,
  options: {
    maxWidth: number;
    crop?: boolean;
    quality?: number;
    ratio?: number;
    format?: "jpeg";
  },
): Promise<OptimizedImage> {
  const source = await loadBitmap(file);
  const sw = "width" in source ? source.width : 0;
  const sh = "height" in source ? source.height : 0;
  if (!sw || !sh) throw new Error("image_decode_failed");

  let targetW = Math.min(options.maxWidth, sw);
  let targetH = Math.round((targetW * sh) / sw);

  let sx = 0;
  let sy = 0;
  let cw = sw;
  let ch = sh;

  if (options.crop) {
    const ratio = options.ratio && options.ratio > 0 ? options.ratio : OG_RATIO;
    targetH = Math.round(targetW / ratio);
    if (sw / sh > ratio) {
      cw = Math.round(sh * ratio);
      sx = Math.round((sw - cw) / 2);
    } else {
      ch = Math.round(sw / ratio);
      sy = Math.round((sh - ch) / 2);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source as CanvasImageSource, sx, sy, cw, ch, 0, 0, targetW, targetH);
  if ("close" in source) source.close();

  const { blob, ext, contentType } = await encode(
    canvas,
    options.quality ?? 0.82,
    options.format,
  );
  return { blob, width: targetW, height: targetH, ext, contentType };
}

/** Cover image variants: og-ready 1200x630 plus a lightweight card thumbnail. */
export async function buildCoverVariants(file: File) {
  const [large, thumb] = await Promise.all([
    optimizeImage(file, { maxWidth: 1200, crop: true, quality: 0.84, format: "jpeg" }),
    optimizeImage(file, { maxWidth: 600, crop: true, quality: 0.7, format: "jpeg" }),
  ]);
  return { large, thumb };
}

/**
 * Generic responsive pair (full size + thumbnail) in WebP when supported.
 * Used by gallery and ad uploads so every stored image ships a light variant.
 */
export async function buildImageVariants(
  file: File,
  options: {
    maxWidth: number;
    thumbWidth?: number;
    crop?: boolean;
    ratio?: number;
    quality?: number;
    format?: "jpeg";
  },
) {
  const [large, thumb] = await Promise.all([
    optimizeImage(file, {
      maxWidth: options.maxWidth,
      crop: options.crop,
      ratio: options.ratio,
      quality: options.quality ?? 0.82,
      format: options.format,
    }),
    optimizeImage(file, {
      maxWidth: Math.min(options.thumbWidth ?? 480, options.maxWidth),
      crop: options.crop,
      ratio: options.ratio,
      quality: 0.7,
      format: options.format,
    }),
  ]);
  return { large, thumb };
}

