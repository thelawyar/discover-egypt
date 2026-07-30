import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onUpdateAvailable, applyUpdate } from "@/lib/register-sw";

/**
 * Non-blocking toast-style bar shown when a newer build is cached and ready.
 * Browsing continues normally until the user taps "تحديث".
 */
export function UpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => onUpdateAvailable(() => setReady(true)), []);

  if (!ready) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-raised backdrop-blur">
        <RefreshCw className="size-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-xs font-medium text-foreground">
          يتوفر إصدار جديد من التطبيق.
        </p>
        <Button
          size="sm"
          className="h-8 shrink-0 rounded-full text-xs"
          disabled={updating}
          onClick={() => {
            setUpdating(true);
            applyUpdate();
          }}
        >
          {updating ? "جارٍ التحديث..." : "تحديث"}
        </Button>
        <button
          type="button"
          onClick={() => setReady(false)}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
}
