import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_DIMENSION = 128;
const VIEWPORT = 288;

/** Validates an uploaded image file and returns a clear Arabic error message. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "صيغة غير مدعومة — يُقبل PNG أو JPG أو WEBP فقط.";
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `حجم الصورة ${mb} ميجابايت — الحد الأقصى المسموح 10 ميجابايت.`;
  }
  if (file.size === 0) return "الملف فارغ أو تالف، جرّب صورة أخرى.";
  return null;
}

type Props = {
  file: File | null;
  /** Crop aspect ratio (width / height). Default 1 (square). */
  ratio?: number;
  /** Output width in pixels. */
  outputWidth?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void | Promise<void>;
  busy?: boolean;
};

export function ImageCropDialog({
  file,
  ratio = 1,
  outputWidth = 512,
  title = "قصّ ومراجعة الصورة",
  onCancel,
  onConfirm,
  busy,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const boxW = VIEWPORT;
  const boxH = Math.round(VIEWPORT / ratio);

  useEffect(() => {
    setError(null);
    setImg(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (!file) {
      setSrc(null);
      return;
    }
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < MIN_DIMENSION || image.naturalHeight < MIN_DIMENSION) {
        setError(
          `أبعاد الصورة صغيرة جداً (${image.naturalWidth}×${image.naturalHeight}) — الحد الأدنى ${MIN_DIMENSION}×${MIN_DIMENSION} بكسل.`,
        );
        return;
      }
      setImg(image);
    };
    image.onerror = () => setError("تعذّرت قراءة الصورة، قد يكون الملف تالفاً.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = img ? Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const dw = img ? img.naturalWidth * scale : 0;
  const dh = img ? img.naturalHeight * scale : 0;

  const clamp = useCallback(
    (v: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(boxW - dw, v.x)),
      y: Math.min(0, Math.max(boxH - dh, v.y)),
    }),
    [boxW, boxH, dw, dh],
  );

  useEffect(() => {
    if (!img) return;
    setOffset((o) => ({
      x: Math.min(0, Math.max(boxW - dw, o.x || (boxW - dw) / 2)),
      y: Math.min(0, Math.max(boxH - dh, o.y || (boxH - dh) / 2)),
    }));
  }, [img, dw, dh, boxW, boxH]);

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    // RTL-safe: we move the raster directly, no direction flip needed.
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function confirm() {
    if (!img || !file) return;
    const outW = outputWidth;
    const outH = Math.round(outputWidth / ratio);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("المتصفح لا يدعم معالجة الصور.");
      return;
    }
    ctx.imageSmoothingQuality = "high";
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    ctx.drawImage(img, sx, sy, boxW / scale, boxH / scale, 0, 0, outW, outH);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92));
    if (!blob) {
      setError("تعذّر إنشاء الصورة بعد القص.");
      return;
    }
    const ext = type === "image/png" ? "png" : "jpg";
    await onConfirm(new File([blob], `crop-${Date.now()}.${ext}`, { type }));
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(o) => (!o && !busy ? onCancel() : undefined)}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            حرّك الصورة بالسحب واستخدم الشريط للتكبير، ثم راجع المعاينة قبل الحفظ.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive"
          >
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative touch-none overflow-hidden rounded-2xl border border-border bg-muted"
              style={{ width: boxW, height: boxH }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {src && img ? (
                <img
                  src={src}
                  alt="معاينة الصورة قبل القص"
                  draggable={false}
                  className="absolute cursor-grab select-none active:cursor-grabbing"
                  style={{
                    width: dw,
                    height: dh,
                    left: offset.x,
                    top: offset.y,
                    maxWidth: "none",
                  }}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {ratio === 1 ? (
                <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-background/80 shadow-[0_0_0_9999px_hsl(var(--background)/0.45)]" />
              ) : null}
            </div>

            <div className="flex w-full items-center gap-3">
              <ZoomIn className="size-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(v) => setZoom(v[0])}
                aria-label="تكبير الصورة"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              PNG أو JPG أو WEBP — حتى 10 ميجابايت، وبحد أدنى {MIN_DIMENSION}×{MIN_DIMENSION}{" "}
              بكسل.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            className="rounded-full"
            onClick={confirm}
            disabled={!img || Boolean(error) || busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ الصورة
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onCancel}
            disabled={busy}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
