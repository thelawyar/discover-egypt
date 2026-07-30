import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSense unit styled like a result card, with a small in-frame label
 * so users can tell it apart from organic results.
 */
export function GoogleAdCard() {
  const settings = useSiteSettings();
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const client = settings.adsense_client?.trim();
  const slot = settings.adsense_slot?.trim();
  const enabled = Boolean(settings.adsense_enabled && client && slot);

  useEffect(() => {
    if (!enabled || pushed.current) return;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    if (!document.querySelector(`script[src^="https://pagead2.googlesyndication.com"]`)) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      pushed.current = true;
    } catch {
      /* AdSense not ready yet */
    }
  }, [enabled, client]);

  if (!enabled) return null;

  return (
    <div className="flex min-h-56 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex-1 p-3">
        <ins
          ref={ref}
          className="adsbygoogle block"
          style={{ display: "block", minHeight: 180 }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
      <span className="border-t border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
        إعلان جوجل
      </span>
    </div>
  );
}
