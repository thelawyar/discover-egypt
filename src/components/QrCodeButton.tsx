import { useState } from "react";
import { QrCode, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Generates a downloadable QR code for the business mini-site URL. */
export function QrCodeButton({
  url,
  fileName,
  className,
}: {
  url: string;
  fileName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setOpen(true);
    if (png || loading) return;
    setLoading(true);
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#131417", light: "#ffffff" },
      });
      setPng(dataUrl);
    } catch {
      toast.error("تعذّر توليد كود QR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`rounded-full ${className ?? ""}`}
        onClick={generate}
      >
        <QrCode className="size-3.5" /> كود QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>كود QR لصفحة النشاط</DialogTitle>
            <DialogDescription dir="ltr" className="break-all text-xs">
              {url}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {png ? (
              <img
                src={png}
                alt="كود QR لصفحة النشاط"
                className="size-56 rounded-xl border border-border bg-white p-2"
              />
            ) : (
              <div className="flex size-56 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                جارٍ التوليد...
              </div>
            )}
            {png ? (
              <Button asChild className="rounded-full">
                <a href={png} download={`${fileName}-qr.png`}>
                  <Download className="size-4" /> تحميل الصورة
                </a>
              </Button>
            ) : null}
            <p className="text-center text-[11px] text-muted-foreground">
              مناسب للطباعة على كروت العمل والملصقات والواجهات.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
